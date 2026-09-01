export const EMBED_SCRIPT = `(() => {
	const script = document.currentScript;
	const workerOrigin = script && script.src ? new URL(script.src).origin : window.location.origin;
	const fileFromScript = script && script.dataset ? script.dataset.file : '';

	function requestLink(email, file) {
		return fetch(workerOrigin + '/api/link', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ email: email, file: file }),
		}).then(function (response) {
			return response.json().then(function (body) {
				return { ok: response.ok, body: body };
			});
		});
	}

	function startDownload(url) {
		window.location.assign(url);
	}

	function bindMarketo() {
		if (!window.MktoForms2) {
			return false;
		}

		window.MktoForms2.whenReady(function (form) {
			form.onSuccess(function (values) {
				const email = values.Email || values.email || '';
				const formEl = form.getFormElem && form.getFormElem()[0];
				const file = (formEl && formEl.getAttribute('data-download-file')) || fileFromScript;
				if (!email || !file) {
					return true;
				}

				requestLink(email, file)
					.then(function (result) {
						if (result.ok && result.body && result.body.url) {
							startDownload(result.body.url);
							return;
						}
						console.error('Download was not issued', result.body);
					})
					.catch(function (error) {
						console.error('Download request failed', error);
					});

				return true;
			});
		});

		return true;
	}

	if (!bindMarketo()) {
		document.addEventListener('DOMContentLoaded', bindMarketo);
	}
})();
`;
