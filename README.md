## Overview
This script downloads receipts from Expensify using Puppeteer, an automated, headless browser.

## Requirements

Bash, node.

## Setup

Install [node and npm](https://www.npmjs.com/get-npm).

Run `npm install puppeteer`

## Usage

Create a JSON file of Expensify receipt links, dates, and transaction IDs. These can be exported from Expensify as a CSV. See Expensify help.

Use your favorite spreadsheet or transformation tool to build a JSON file where each line is like this:

```
{ "url" : "https://www.expensify.com/verifyReceipt...", "receipt_file": "2019-02-03_19194835911051587"}
```

`receipt_file` is the name of the output file. An extension will be added. I used the date + transaction ID parsed out of the URL as the receipt_file but any format is fine, as long as it is unique per receipt.

Run this command line in Bash.

`cat <your input file> | HEADLESS=1 OUTPUT_FILE=out1.txt node get_receipts.js`

Change HEADLESS to 0 for debugging, but be warned, the script will fail while trying to generate PDFs of eReceipts (see [this issue](https://github.com/GoogleChrome/puppeteer/issues/1829)).

The script will output a JSON line for each attempted download, with information about the download, the actual filename, and errors.

## TO DO

* Parse URL to automatically generate filename 
* Handle timeouts