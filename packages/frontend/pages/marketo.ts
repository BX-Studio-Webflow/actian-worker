const EMAIL_STORAGE_KEY = 'actian-trial-email';

function storeEmail(email: string): void {
	const trimmed = email.trim();
	if (trimmed) {
		sessionStorage.setItem(EMAIL_STORAGE_KEY, trimmed);
	}
}

function bindMarketo(): void {
	if (!window.MktoForms2) {
		return;
	}

	window.MktoForms2.whenReady((form) => {
		form.onSuccess((values) => {
			storeEmail(values.Email || values.email || '');
			return true;
		});
	});
}

bindMarketo();
