interface MktoFormValues {
	Email?: string;
	email?: string;
	[key: string]: string | undefined;
}

interface MktoForm {
	onSuccess(callback: (values: MktoFormValues) => boolean | void): void;
	getFormElem(): ArrayLike<HTMLElement>;
}

interface MktoForms2 {
	whenReady(callback: (form: MktoForm) => void): void;
}

interface Window {
	MktoForms2?: MktoForms2;
}

declare const API_ORIGIN: string;
declare const SERVE_ORIGIN: string;
