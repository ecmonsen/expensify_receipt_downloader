const readline = require('readline');
const process = require('process');
const fs = require('fs');
const path = require('path');

var headless_opts, headless_str=process.env.HEADLESS, output_file=process.env.OUTPUT_FILE;

if (!output_file) {
  throw "Please set OUTPUT_FILE env var"
} else {
  output_file = path.resolve(output_file);
  console.log(`Output will go to ${output_file}`);
}

try {
  let parsed = JSON.parse(headless_str);
  console.log(`Parsed:${parsed}`);

  if (!parsed) {
    // Only define headless_opts if we DON'T want to run headless.
    // because {headless:true} confuses Puppeteer.
    headless_opts = {headless: false}
  }
  console.log(`headless_opts:${JSON.stringify(headless_opts)}`);
} catch(err) {
  console.log("(could not parse HEADLESS env var, continuing)");
}

// Log with timestamps
console.logCopy = console.log.bind(console);
console.log = function(data)
{
  var timestamp = '[' + Date.now() + '] ';
  this.logCopy(timestamp, data);
};

// Read the lines - one JSON blob per line
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

var jlines = [];

rl.on('line', function (line) {
  jlines.push(line);
});

var ext_regex = /.*\.([^\.]+)$/; // characters following the final '.'

async function scrapeReceipt(jline, page) {

  let j = JSON.parse(jline);

  // j = { "url" : "xxxx", "receipt_file": "xxxx"}
  let download_btn;
  try {
    console.log(JSON.stringify(j));
    await page.goto(j.url,{waitUntil: ['networkidle0', 'load', 'domcontentloaded']});

    // Check whether "Download a copy" button exists
    download_btn = await page.$$('a.btn');
    if (download_btn.length > 0) {
      try {
        j.download_type = 'uploaded';
        j.image_url = await page.$eval('a.btn', e => e.getAttribute('href'));
        let extension = ext_regex.exec(j.image_url)[1].toLowerCase();
        j.actual_receipt_file = `${j.receipt_file}.${extension}`;
        if (extension == 'pdf') {
          console.log("Cannot download PDFs in headless mode");
          j.downloaded = false;
        } else {
          console.log(`downloading uploaded image ${j.image_url}`);
          var viewSource = await page.goto(j.image_url, {waitUntil: ['networkidle0', 'load', 'domcontentloaded']});
          fs.writeFile(j.actual_receipt_file, await viewSource.buffer(), function (err) {
            if (err) {
              console.log(`ERROR downloading file: ${err}`);
              j.error = err;
            } else {
              console.log("Success");
              j.downloaded = true;
            }
          });
        }
      } catch (err) {
        console.log(`ERROR getting image url or downloading file: ${err}`)
        j.error = err;
      }
    } else {
      // download this page as pdf
      console.log(`downloading file as pdf`)
      try {
        j.actual_receipt_file = `${j.receipt_file}.pdf`;
        j.download_type = 'eReceipt';
        await page.pdf({path: j.actual_receipt_file, format: 'Letter'});
        j.downloaded=true;
      } catch(err) {
        console.log(`ERROR downloading page as pdf: ${err}`);
        j.error = err;

      }
    }
  } catch(err) {
    console.log(`ERROR going to page url: ${err}`)
    j.error = err;
  }
  return j;

}


const puppeteer = require('puppeteer');

rl.on('close', async () => {
  console.log(`Processing ${jlines.length} lines`);

  const browser = await puppeteer.launch(headless_opts);

  var page = await browser.newPage();
  await page.setViewport({width: 1500, height: 1700});

  // Setting the Accept-Language allows Amazon to accept requests from the headless browser.
  // (from https://github.com/GoogleChrome/puppeteer/issues/665)
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
  });

  let j;
  for (const jline of jlines) {
    j = await scrapeReceipt(jline, page);
    console.log(j);
    await fs.appendFile(output_file, JSON.stringify(j)+"\n", (err) => {
      if (err) console.log(`Error appending to ${output_file}`);
    });
  }

  await browser.close();

});
