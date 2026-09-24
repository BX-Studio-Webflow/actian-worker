import { requestDownloadLink } from '../shared/api';
import { COUNTRY_STORAGE_KEY, EMAIL_STORAGE_KEY, isBlockedTrialCountry } from '../shared/session';

const DOWNLOAD_LINK_SELECTOR = '[dev-target="download-link"]';
const ERROR_WRAPPER_SELECTOR = '[dev-target="error-wrapper"]';
const ERROR_TEXT_SELECTOR = '[dev-target="error-text"]';
const ERROR_CANCEL_SELECTOR = '[dev-target="cancel"]';
const API_ORIGIN = 'https://actian-trial-downloads.cf-jaspersoft.workers.dev';

const COUNTRY_BLOCKED_MESSAGE = 'Downloads are not available in your region.';

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

bindDownloads();
bindErrorCancel();

if (isBlockedTrialCountry(readCountry())) {
	showError(COUNTRY_BLOCKED_MESSAGE);
}
