import { requestDownloadLink } from '../shared/api';
import { COUNTRY_STORAGE_KEY, EMAIL_STORAGE_KEY, isBlockedTrialCountry, isBlockedTrialEmail } from '../shared/session';

const DOWNLOAD_LINK_SELECTOR = '[dev-target="download-link"]';
const ERROR_WRAPPER_SELECTOR = '[dev-target="error-wrapper"]';
const ERROR_TEXT_SELECTOR = '[dev-target="error-text"]';
const ERROR_CANCEL_SELECTOR = '[dev-target="cancel"]';
const API_ORIGIN = 'https://actian-trial-downloads.cf-jaspersoft.workers.dev';

const COUNTRY_BLOCKED_MESSAGE = 'Downloads are not available in your region.';
const EMAIL_BLOCKED_MESSAGE = 'Downloads are limited to business email addresses.';
const THANK_YOU_PATH = /^(.*)\/trial\/thank-you(?:-v9)?\/?$/;

function thankYouTrialPath(): string | null {
	const match = window.location.pathname.match(THANK_YOU_PATH);
	if (!match) {
		return null;
	}

	return `${match[1]}/trial`;
}

function markThankYouUnindexed(): void {
	if (!thankYouTrialPath()) {
		return;
	}

	let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
	if (!robots) {
		robots = document.createElement('meta');
		robots.name = 'robots';
		document.head.appendChild(robots);
	}

	robots.content = 'noindex, nofollow';
}

function readStoredEmail(): string {
	return sessionStorage.getItem(EMAIL_STORAGE_KEY)?.trim() || '';
}

function readCountry(): string {
	return sessionStorage.getItem(COUNTRY_STORAGE_KEY)?.trim() || '';
}

function readEmail(): string {
	const stored = sessionStorage.getItem(EMAIL_STORAGE_KEY);
	if (stored) {
		return stored;
	}

	const input = document.querySelector<HTMLInputElement>('input[name="Email"], input#Email, input[type="email"]');
	return input?.value.trim() || '';
}

function fileFromLink(link: HTMLAnchorElement): string {
	return link.getAttribute('metadata')?.trim() || '';
}

function showError(message: string): void {
	const wrapper = document.querySelector<HTMLElement>(ERROR_WRAPPER_SELECTOR);
	const text = wrapper?.querySelector<HTMLElement>(ERROR_TEXT_SELECTOR);
	if (!wrapper || !text) {
		return;
	}

	text.textContent = message;
	wrapper.classList.remove('hide');
}

function hideError(): void {
	document.querySelector<HTMLElement>(ERROR_WRAPPER_SELECTOR)?.classList.add('hide');
}

function bindDownloads(): void {
	document.querySelectorAll<HTMLAnchorElement>(DOWNLOAD_LINK_SELECTOR).forEach((link) => {
		link.addEventListener('click', (event) => {
			const file = fileFromLink(link);
			const email = readEmail();
			if (!file) {
				console.error('[Download process] No file specified for download');
				showError('The selected download is unavailable.');
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			if (isBlockedTrialCountry(readCountry())) {
				showError(COUNTRY_BLOCKED_MESSAGE);
				return;
			}

			if (isBlockedTrialEmail(email)) {
				showError(EMAIL_BLOCKED_MESSAGE);
				return;
			}

			if (!email) {
				console.error('[Download process] No email provided for download');
				showError('Please submit the trial form before downloading.');
				return;
			}

			void requestDownloadLink(API_ORIGIN, email, file)
				.then((result) => {
					if (result.url) {
						window.location.assign(result.url);
						return;
					}

					console.error('[Download process] Download was not issued', result);
					showError(result.message || 'The download could not be issued.');
				})
				.catch((error: unknown) => {
					console.error('[Download process] Download request failed', error);
					showError('The download request failed. Please try again.');
				});
		});
	});
}

function bindErrorCancel(): void {
	document.querySelectorAll<HTMLElement>(ERROR_CANCEL_SELECTOR).forEach((cancel) => {
		cancel.addEventListener('click', hideError);
	});
}

markThankYouUnindexed();

const trialPath = thankYouTrialPath();
if (trialPath && !readStoredEmail()) {
	window.location.replace(trialPath);
} else {
	bindDownloads();
	bindErrorCancel();

	if (isBlockedTrialCountry(readCountry())) {
		showError(COUNTRY_BLOCKED_MESSAGE);
	} else if (isBlockedTrialEmail(readStoredEmail())) {
		showError(EMAIL_BLOCKED_MESSAGE);
	}
}
