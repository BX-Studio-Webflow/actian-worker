import { requestDownloadLink } from '../shared/api';

const EMAIL_STORAGE_KEY = 'actian-trial-email';
const DOWNLOAD_LINK_SELECTOR = '.item-trial_download a.cta-main';
const API_ORIGIN = 'https://actian-trial-downloads.cf-jaspersoft.workers.dev';

function readEmail(): string {
    const stored = sessionStorage.getItem(EMAIL_STORAGE_KEY);
    if (stored) {
        return stored;
    }

    const input = document.querySelector<HTMLInputElement>('input[name="Email"], input#Email, input[type="email"]');
    return input?.value.trim() || '';
}

function fileFromLink(link: HTMLAnchorElement): string {
    const attributed = link.getAttribute('data-download-file');
    if (attributed) {
        return attributed.trim();
    }

    try {
        const url = new URL(link.href, window.location.href);
        return decodeURIComponent(url.pathname.split('/').pop() || '');
    } catch {
        return '';
    }
}

function scrollToForm(): void {
    const form = document.querySelector('.mktoForm, form');
    if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function bindDownloads(): void {
    document.addEventListener('click', (event) => {
        const { target } = event;
        if (!(target instanceof Element)) {
            return;
        }

        const link = target.closest<HTMLAnchorElement>(DOWNLOAD_LINK_SELECTOR);
        if (!link) {
            return;
        }

        const file = fileFromLink(link);
        const email = readEmail();
        if (!file) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!email) {
            scrollToForm();
            return;
        }

        void requestDownloadLink(API_ORIGIN, email, file)
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
    });
}

bindDownloads();
