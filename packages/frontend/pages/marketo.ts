import { COUNTRY_STORAGE_KEY, EMAIL_STORAGE_KEY } from '../shared/session';

const MARKETO_READY_TIMEOUT_MS = 15_000;
const MARKETO_POLL_INTERVAL_MS = 100;

function storeValue(key: string, value: string): void {
	const trimmed = value.trim();
	if (trimmed) {
		sessionStorage.setItem(key, trimmed);
	}
}

function registerSuccessHandler(): void {
	window.MktoForms2?.whenReady((form) => {
		form.onSuccess((values) => {
			storeValue(EMAIL_STORAGE_KEY, values.Email || values.email || '');
			storeValue(COUNTRY_STORAGE_KEY, values.Country || values.country || '');
			return true;
		});
	});
}

function bindMarketo(): void {
	if (window.MktoForms2) {
		registerSuccessHandler();
		return;
	}

	const startedAt = Date.now();
	const timer = window.setInterval(() => {
		if (window.MktoForms2) {
			window.clearInterval(timer);
			registerSuccessHandler();
			return;
		}

		if (Date.now() - startedAt >= MARKETO_READY_TIMEOUT_MS) {
			window.clearInterval(timer);
		}
	}, MARKETO_POLL_INTERVAL_MS);
}

bindMarketo();
