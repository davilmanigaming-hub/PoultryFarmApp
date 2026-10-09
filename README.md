# Poultry Farm Manager

A responsive poultry farm sales app for mobile and computer. It uses HTML, CSS and JavaScript and can be opened in VS Code.

## Features
- First-time starting rooster stock setup
- Price selection: ₹300, ₹350, ₹400 or ₹450 per kg
- Enter number of roosters sold and total weight; amount is calculated automatically
- Saved sales history with date filtering, search and sale details
- Automatic remaining-stock calculation
- Admin-only stock additions, account creation and sale deletion
- Users cannot register themselves; the admin creates approved accounts
- Change password and JSON backup export/import
- Responsive layout and optional PWA install support

## First login
- Username: `admin`
- Password: `Farm@123`

**Security:** Log in and change this password immediately. This starter app stores account data in the browser's local storage and is intended for a trusted, single-device setup. It is not a secure multi-user cloud system: anyone with direct access to the browser's developer tools or the browser profile may be able to inspect or alter local data. Passwords are stored locally in this starter version, so do not use the same password as any other account.

## Run on your computer
1. Extract the ZIP file.
2. Open the `PoultryFarmApp` folder in VS Code.
3. Install the VS Code **Live Server** extension, if you do not have it.
4. Right-click `index.html` and choose **Open with Live Server**.

You can also open `index.html` directly, but service-worker install/offline features require a local web server or HTTPS.

## Use on a phone
To use it on a phone, the app files must be served from a computer or hosted on an HTTPS website. Open that address in the phone browser. For an installable PWA, use the browser's **Add to Home Screen** option. A phone and computer each keep their own local data unless you manually export/import a backup.

## Important limitation
This project provides local permanent storage in the same browser profile, not automatic cloud synchronization. To have different people sign in from different devices and share one live sales history, the app needs a hosted backend/database and proper server-side authentication/permissions. A front-end-only ZIP cannot securely enforce admin permissions against someone who can modify its code.

## Data backup
Open **Settings → Export backup** to save a JSON copy. Keep it private. **Import backup** replaces the data currently stored in that browser.

## Formula
`Estimated amount = selected price per kg × total weight (kg)`

`Remaining roosters = starting stock + stock additions − total roosters in saved sales`
