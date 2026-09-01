import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOWNLOADS_DIR = join(ROOT, 'downloads');
const DEV_VARS = join(ROOT, '.dev.vars');

function loadDevVars(path) {
	if (!existsSync(path)) {
		return;
	}

	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const index = trimmed.indexOf('=');
		if (index < 0) {
			continue;
		}

		const key = trimmed.slice(0, index).trim();
		const value = trimmed.slice(index + 1).trim();
		if (key && process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

loadDevVars(DEV_VARS);

const WRAPPER_ZIP = /^\d+\.\d+\.x trials-.*\.zip$/i;

const LOCAL_UPLOAD_MAP = {
	'js-jrs_10.0.0_linux_x86_64.run': '10.0.0/js-jrs_10.0.0_linux_x86_64.run',
	'js-jrio-pro_10.0.0_macos_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip',
	'JasperReports-Server_9.0.0_win_x86_64.exe': '9.0.0/JasperReports-Server_9.0.0_win_x86_64.exe',
	'JasperReports-Server_9.0.0_linux_x86_64.run': '9.0.0/JasperReports-Server_9.0.0_linux_x86_64.run',
	'JasperReports-IO_4.0.0_macosx_x86_64.zip': '9.0.0/JasperReports-IO_4.0.0_macosx_x86_64.zip',
};

function walkFiles(dir) {
	if (!existsSync(dir)) {
		return [];
	}

	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkFiles(path));
			continue;
		}

		if (entry.isFile()) {
			files.push(path);
		}
	}

	return files;
}

function r2KeyFor(path) {
	const name = basename(path);
	if (WRAPPER_ZIP.test(name)) {
		return null;
	}

	return LOCAL_UPLOAD_MAP[name] ?? null;
}

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing ${name}. Set it in packages/server/.dev.vars`);
	}
	return value;
}

function parseArgs(argv) {
	return {
		dryRun: argv.includes('--dry-run'),
		skipExisting: argv.includes('--skip-existing'),
	};
}

async function objectExists(client, bucket, key) {
	try {
		await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
		return true;
	} catch (error) {
		if (error && (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404)) {
			return false;
		}
		throw error;
	}
}

async function main() {
	const { dryRun, skipExisting } = parseArgs(process.argv.slice(2));

	const jobs = walkFiles(DOWNLOADS_DIR)
		.map((path) => ({ path, key: r2KeyFor(path) }))
		.filter((job) => job.key);

	if (jobs.length === 0) {
		console.error(`No mapped installers found under ${DOWNLOADS_DIR}`);
		process.exitCode = 1;
		return;
	}

	if (dryRun) {
		for (const job of jobs) {
			const sizeMb = (statSync(job.path).size / (1024 * 1024)).toFixed(1);
			console.log(`dry   ${sizeMb} MB  ${basename(job.path)} -> ${job.key}`);
		}
		return;
	}

	const accountId = requiredEnv('R2_ACCOUNT_ID');
	const bucket = process.env.R2_BUCKET_NAME || 'actian-trial-downloads';

	const client = new S3Client({
		region: 'auto',
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		forcePathStyle: true,
		credentials: {
			accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
			secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
		},
	});

	for (const job of jobs) {
		const sizeMb = (statSync(job.path).size / (1024 * 1024)).toFixed(1);
		if (skipExisting && (await objectExists(client, bucket, job.key))) {
			console.log(`skip  ${job.key} (already in ${bucket})`);
			continue;
		}

		console.log(`put   ${sizeMb} MB  ${basename(job.path)} -> ${bucket}/${job.key}`);
		const upload = new Upload({
			client,
			params: {
				Bucket: bucket,
				Key: job.key,
				Body: createReadStream(job.path),
			},
			leavePartsOnError: false,
		});

		upload.on('httpUploadProgress', (progress) => {
			if (progress.total) {
				const pct = Math.round(((progress.loaded ?? 0) / progress.total) * 100);
				process.stdout.write(`\r      ${pct}%`);
			}
		});

		await upload.done();
		process.stdout.write('\n');
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
