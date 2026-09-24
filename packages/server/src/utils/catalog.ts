/**
 * Trial file catalog.
 *
 * Download CTAs send one of these strings in the `metadata` attribute.
 * Short aliases and the R2 object keys below are both accepted.
 * An unknown string returns 400 invalid_file. A known key missing from R2 returns 404.
 * Mac Jaspersoft Studio is `10.0.0/js-jss_10.0.0_macosx_x86_64.dmg` (`jss-macos`), not a `.zip`.
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

	// 9.0 line — Server 9.0.0, Studio 9.0.3, Web Studio 3.0.0, IO 4.0.0
	'jrs-windows-9': '9.0.0/js-jrs_9.0.0_win_x86_64.exe',
	'jrs-macos-9': '9.0.0/js-jrs_9.0.0_macosx_x86_64.zip',
	'jrs-linux-9': '9.0.0/js-jrs_9.0.0_linux_x86_64.run',
	'jss-windows-9': '9.0.3/js-jss_9.0.3_windows_x86_64.exe',
	'jss-macos-9': '9.0.3/js-jss_9.0.3_macosx_x86_64.dmg',
	'jss-linux-9': '9.0.3/js-jss_9.0.3_linux_x86_64.tgz',
	'jrws-windows-9': '3.0.0/js-jrws-pro_3.0.0_win_x86_64.zip',
	'jrws-macos-9': '3.0.0/js-jrws-pro_3.0.0_macosx_x86_64.zip',
	'jrws-linux-9': '3.0.0/js-jrws-pro_3.0.0_linux_x86_64.zip',
	'jrio-windows-9': '4.0.0/js-jrio-pro_4.0.0_win_x86_64.zip',
	'jrio-macos-9': '4.0.0/js-jrio-pro_4.0.0_macosx_x86_64.zip',
	'jrio-linux-9': '4.0.0/js-jrio-pro_4.0.0_linux_x86_64.zip',
	'js-jrs-dev_9.0.0_win_x86_64.exe': '9.0.0/js-jrs_9.0.0_win_x86_64.exe',
	'js-jrs-dev_9.0.0_macosx_x86_64.zip': '9.0.0/js-jrs_9.0.0_macosx_x86_64.zip',
	'js-jrs-dev_9.0.0_linux_x86_64.run': '9.0.0/js-jrs_9.0.0_linux_x86_64.run',
	'js-jss-dev_9.0.3_windows_x86_64.exe': '9.0.3/js-jss_9.0.3_windows_x86_64.exe',
	'js-jss-dev_9.0.3_macosx_x86_64.dmg': '9.0.3/js-jss_9.0.3_macosx_x86_64.dmg',
	'js-jss-dev_9.0.3_linux_x86_64.tgz': '9.0.3/js-jss_9.0.3_linux_x86_64.tgz',
	'js-jrws-pro-dev_3.0.0_win_x86_64.zip': '3.0.0/js-jrws-pro_3.0.0_win_x86_64.zip',
	'js-jrws-pro-dev_3.0.0_macosx_x86_64.zip': '3.0.0/js-jrws-pro_3.0.0_macosx_x86_64.zip',
	'js-jrws-pro-dev_3.0.0_linux_x86_64.zip': '3.0.0/js-jrws-pro_3.0.0_linux_x86_64.zip',
	'js-jrio-pro-dev_4.0.0_win_x86_64.zip': '4.0.0/js-jrio-pro_4.0.0_win_x86_64.zip',
	'js-jrio-pro-dev_4.0.0_macosx_x86_64.zip': '4.0.0/js-jrio-pro_4.0.0_macosx_x86_64.zip',
	'js-jrio-pro-dev_4.0.0_linux_x86_64.zip': '4.0.0/js-jrio-pro_4.0.0_linux_x86_64.zip',
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
	'js-jrs-dev_9.0.0_win_x86_64.exe': '9.0.0/js-jrs_9.0.0_win_x86_64.exe',
	'js-jrs-dev_9.0.0_macosx_x86_64.zip': '9.0.0/js-jrs_9.0.0_macosx_x86_64.zip',
	'js-jrs-dev_9.0.0_linux_x86_64.run': '9.0.0/js-jrs_9.0.0_linux_x86_64.run',
	'js-jss-dev_9.0.3_windows_x86_64.exe': '9.0.3/js-jss_9.0.3_windows_x86_64.exe',
	'js-jss-dev_9.0.3_macosx_x86_64.dmg': '9.0.3/js-jss_9.0.3_macosx_x86_64.dmg',
	'js-jss-dev_9.0.3_linux_x86_64.tgz': '9.0.3/js-jss_9.0.3_linux_x86_64.tgz',
	'js-jrws-pro-dev_3.0.0_win_x86_64.zip': '3.0.0/js-jrws-pro_3.0.0_win_x86_64.zip',
	'js-jrws-pro-dev_3.0.0_macosx_x86_64.zip': '3.0.0/js-jrws-pro_3.0.0_macosx_x86_64.zip',
	'js-jrws-pro-dev_3.0.0_linux_x86_64.zip': '3.0.0/js-jrws-pro_3.0.0_linux_x86_64.zip',
	'js-jrio-pro-dev_4.0.0_win_x86_64.zip': '4.0.0/js-jrio-pro_4.0.0_win_x86_64.zip',
	'js-jrio-pro-dev_4.0.0_macosx_x86_64.zip': '4.0.0/js-jrio-pro_4.0.0_macosx_x86_64.zip',
	'js-jrio-pro-dev_4.0.0_linux_x86_64.zip': '4.0.0/js-jrio-pro_4.0.0_linux_x86_64.zip',
};

export function isWrapperArchive(fileName: string): boolean {
	return /^\d+\.\d+\.x trials-.*\.zip$/i.test(fileName);
}
