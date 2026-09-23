const EMAIL_STORAGE_KEY = 'actian-trial-email';
const MARKETO_READY_TIMEOUT_MS = 15_000;
const MARKETO_POLL_INTERVAL_MS = 100;

function storeEmail(email: string): void {
	const trimmed = email.trim();
	if (trimmed) {
		sessionStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
	}
}

function registerSuccessHandler(): void {
	window.MktoForms2?.whenReady((form) => {
		form.onSuccess((values) => {
			storeEmail(values.Email || values.email || '');
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
