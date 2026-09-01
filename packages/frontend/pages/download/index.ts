import { requestDownloadLink } from '../../shared/api';

function currentScript(): HTMLScriptElement | null {
	if (document.currentScript instanceof HTMLScriptElement) {
		return document.currentScript;
	}

	const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');
	return scripts[scripts.length - 1] ?? null;
}

function trimSlash(value: string): string {
	return value.replace(/\/$/, '');
}

function apiOrigin(script: HTMLScriptElement | null): string {
	const fromDataset = script?.dataset.api;
	if (fromDataset) {
		return trimSlash(fromDataset);
	}

	if (typeof API_ORIGIN === 'string' && API_ORIGIN) {
		return trimSlash(API_ORIGIN);
	}

	return '';
}

function fileId(script: HTMLScriptElement | null, formEl?: HTMLElement): string {
	return formEl?.getAttribute('data-download-file') || script?.dataset.file || '';
}

function bindMarketo(script: HTMLScriptElement | null): boolean {
	if (!window.MktoForms2) {
		return false;
	}

	window.MktoForms2.whenReady((form) => {
		form.onSuccess((values) => {
			const email = values.Email || values.email || '';
			const formEl = form.getFormElem()[0];
			const file = fileId(script, formEl);
			const origin = apiOrigin(script);

			if (!email || !file || !origin) {
				return true;
			}

			void requestDownloadLink(origin, email, file)
				.then((result) => {
					if (result.url) {
						window.location.assign(result.url);
						return;
					}

					console.error('Download was not issued', result);
				})
				.catch((error: unknown) => {
					console.error('Download request failed', error);
				});

			return true;
		});
	});

	return true;
}

const script = currentScript();

if (!bindMarketo(script)) {
	document.addEventListener('DOMContentLoaded', () => {
		bindMarketo(script);
	});
}
