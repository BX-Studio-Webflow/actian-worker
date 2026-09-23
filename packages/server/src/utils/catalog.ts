/**
 * Trial file catalog.
 *
 * Aliases are what the Webflow page / frontend send. Values are R2 object keys.
 * TIBCO edownload filenames are included so we can intercept existing CTAs
 * without rewriting every href.
 *
 * Local copies currently on disk (Chris extract) are only a subset of 10.0/9.0.
 * Missing objects 404 until they are uploaded.
 */
export const FILE_CATALOG: Record<string, string> = {
	// 10.0.0 — Windows
	'jrs-windows': '10.0.0/js-jrs_10.0.0_win_x86_64.exe',
	'jss-windows': '10.0.0/js-jss_10.0.0_windows_x86_64.exe',
	'jrws-windows': '10.0.0/js-jrws-pro_10.0.0_windows_x86_64.zip',
	'jrio-windows': '10.0.0/js-jrio-pro_10.0.0_windows_x86_64.zip',
	'js-jrs-dev_10.0.0_win_x86_64.exe': '10.0.0/js-jrs_10.0.0_win_x86_64.exe',
	'js-jss-dev_10.0.0_windows_x86_64.exe': '10.0.0/js-jss_10.0.0_windows_x86_64.exe',
	'js-jrws-pro-dev_10.0.0_windows_x86_64.zip': '10.0.0/js-jrws-pro_10.0.0_windows_x86_64.zip',
	'js-jrio-pro-dev_10.0.0_windows_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_windows_x86_64.zip',

	// 10.0.0 — Mac
	'jrs-macos': '10.0.0/js-jrs_10.0.0_macosx_x86_64.zip',
	'jss-macos': '10.0.0/js-jss_10.0.0_macosx_x86_64.dmg',
	'jrws-macos': '10.0.0/js-jrws-pro_10.0.0_mac_x86_64.zip',
	'jrio-macos': '10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip',
	'js-jrs-dev_10.0.0_macosx_x86_64.zip': '10.0.0/js-jrs_10.0.0_macosx_x86_64.zip',
	'js-jss-dev_10.0.0_macosx_x86_64.dmg': '10.0.0/js-jss_10.0.0_macosx_x86_64.dmg',
	'js-jrws-pro-dev_10.0.0_mac_x86_64.zip': '10.0.0/js-jrws-pro_10.0.0_mac_x86_64.zip',
	'js-jrio-pro-dev_10.0.0_macos_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip',

	// 10.0.0 — Linux
	'jrs-linux': '10.0.0/js-jrs_10.0.0_linux_x86_64.run',
	'jss-linux': '10.0.0/js-jss_10.0.0_linux_x86_64.tgz',
	'jrws-linux': '10.0.0/js-jrws-pro_10.0.0_linux_x86_64.zip',
	'jrio-linux': '10.0.0/js-jrio-pro_10.0.0_linux_x86_64.zip',
	'js-jrs-dev_10.0.0_linux_x86_64.run': '10.0.0/js-jrs_10.0.0_linux_x86_64.run',
	'js-jss-dev_10.0.0_linux_x86_64.tgz': '10.0.0/js-jss_10.0.0_linux_x86_64.tgz',
	'js-jrws-pro-dev_10.0.0_linux_x86_64.zip': '10.0.0/js-jrws-pro_10.0.0_linux_x86_64.zip',
	'js-jrio-pro-dev_10.0.0_linux_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_linux_x86_64.zip',

	// Local extract filenames (no -dev suffix)
	'js-jrs_10.0.0_linux_x86_64.run': '10.0.0/js-jrs_10.0.0_linux_x86_64.run',
	'js-jrio-pro_10.0.0_macos_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip',

	// 9.0.0 extracts currently on disk
	'jrs-windows-9': '9.0.0/JasperReports-Server_9.0.0_win_x86_64.exe',
	'jrs-linux-9': '9.0.0/JasperReports-Server_9.0.0_linux_x86_64.run',
	'jrio-macos-4': '9.0.0/JasperReports-IO_4.0.0_macosx_x86_64.zip',
	'JasperReports-Server_9.0.0_win_x86_64.exe': '9.0.0/JasperReports-Server_9.0.0_win_x86_64.exe',
	'JasperReports-Server_9.0.0_linux_x86_64.run': '9.0.0/JasperReports-Server_9.0.0_linux_x86_64.run',
	'JasperReports-IO_4.0.0_macosx_x86_64.zip': '9.0.0/JasperReports-IO_4.0.0_macosx_x86_64.zip',
};

/** Basename of a local installer → R2 key. Wrapper zip archives are omitted. */
export const LOCAL_UPLOAD_MAP: Record<string, string> = {
	'js-jrs-dev_10.0.0_win_x86_64.exe': '10.0.0/js-jrs_10.0.0_win_x86_64.exe',
	'js-jss-dev_10.0.0_windows_x86_64.exe': '10.0.0/js-jss_10.0.0_windows_x86_64.exe',
	'js-jrws-pro-dev_10.0.0_windows_x86_64.zip': '10.0.0/js-jrws-pro_10.0.0_windows_x86_64.zip',
	'js-jrio-pro-dev_10.0.0_windows_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_windows_x86_64.zip',
	'js-jrs-dev_10.0.0_macosx_x86_64.zip': '10.0.0/js-jrs_10.0.0_macosx_x86_64.zip',
	'js-jss-dev_10.0.0_macosx_x86_64.dmg': '10.0.0/js-jss_10.0.0_macosx_x86_64.dmg',
	'js-jrws-pro-dev_10.0.0_mac_x86_64.zip': '10.0.0/js-jrws-pro_10.0.0_mac_x86_64.zip',
	'js-jrio-pro-dev_10.0.0_macos_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip',
	'js-jrs-dev_10.0.0_linux_x86_64.run': '10.0.0/js-jrs_10.0.0_linux_x86_64.run',
	'js-jss-dev_10.0.0_linux_x86_64.tgz': '10.0.0/js-jss_10.0.0_linux_x86_64.tgz',
	'js-jrws-pro-dev_10.0.0_linux_x86_64.zip': '10.0.0/js-jrws-pro_10.0.0_linux_x86_64.zip',
	'js-jrio-pro-dev_10.0.0_linux_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_linux_x86_64.zip',
	'js-jrs_10.0.0_linux_x86_64.run': '10.0.0/js-jrs_10.0.0_linux_x86_64.run',
	'js-jrio-pro_10.0.0_macos_x86_64.zip': '10.0.0/js-jrio-pro_10.0.0_macos_x86_64.zip',
	'JasperReports-Server_9.0.0_win_x86_64.exe': '9.0.0/JasperReports-Server_9.0.0_win_x86_64.exe',
	'JasperReports-Server_9.0.0_linux_x86_64.run': '9.0.0/JasperReports-Server_9.0.0_linux_x86_64.run',
	'JasperReports-IO_4.0.0_macosx_x86_64.zip': '9.0.0/JasperReports-IO_4.0.0_macosx_x86_64.zip',
};

export function isWrapperArchive(fileName: string): boolean {
	return /^\d+\.\d+\.x trials-.*\.zip$/i.test(fileName);
}
