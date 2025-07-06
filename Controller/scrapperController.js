const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const Crawler = require('simplecrawler');

const { isValidEmail, emailRegex, isContactFormPage } = require("../Utils/scrapperUtils");

exports.ScrapEmails = catchAsyncError(async (req, res, next) => {
    const { Url } = req.body;

    if (!Url) {
        return next(new ErrorHandler("URL is required", 400));
    }

    let normalizedUrl = Url;
    if (!Url.startsWith('https://')) {
        normalizedUrl = 'https://' + Url;
    }

    const emailsByPage = {};
    const pages = [];
    const contactFormUrls = [];
    const errors = [];
    let isCompleted = false;
    let timeoutId;
    let crawler;

    const exclude = ['gif', 'jpg', 'jpeg', 'png', 'ico', 'bmp', 'ogg', 'webp',
        'mp4', 'webm', 'mp3', 'ttf', 'woff', 'json', 'rss', 'atom', 'gz', 'zip',
        'rar', '7z', 'css', 'js', 'gzip', 'exe', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

    const exts = exclude.join('|');
    const regex = new RegExp('\\.(' + exts + ')', 'i');

    crawler = new Crawler(normalizedUrl);

    crawler.maxDepth = 3;
    crawler.maxConcurrency = 5;
    crawler.respectRobotsTxt = true;
    crawler.userAgent = 'EmailScraper/1.0';

    crawler.addFetchCondition(function (parsedURL) {
        return !parsedURL.path.match(regex);
    });

    const sendResponse = (isComplete = false) => {
        if (isCompleted) return;

        isCompleted = true;
        clearTimeout(timeoutId);

        if (crawler && crawler.running) {
            crawler.stop();
        }

        const totalEmails = Object.values(emailsByPage).reduce((total, emails) => total + emails.length, 0);

        const emailsByPageFiltered = {};
        Object.keys(emailsByPage).forEach(url => {
            if (emailsByPage[url].length > 0) {
                emailsByPageFiltered[url] = emailsByPage[url];
            }
        });

        const message = isComplete
            ? `Successfully scraped ${pages.length} pages and found ${totalEmails} total emails`
            : `Website couldn't be scraped completely. Found ${totalEmails} emails from ${pages.length} pages so far`;

        console.log(`Sending response: ${message}`);
        console.log(`Pages scanned: ${pages.join(', ')}`);
        console.log(`Contact forms found: ${contactFormUrls.join(', ')}`);

        res.status(200).json({
            success: true,
            data: {
                totalPages: pages.length,
                totalEmails: totalEmails,
                emailsByPage: emailsByPageFiltered,
                contactFormUrls: contactFormUrls,
                totalContactForms: contactFormUrls.length,
                scannedPages: pages,
                errors: errors,
                isComplete: isComplete
            },
            message: message
        });
    };

    timeoutId = setTimeout(() => {
        console.log("Timeout reached - stopping crawler and sending partial results");
        sendResponse(false);
    }, 30000);

    crawler.on('fetchcomplete', function (item, responseBuffer, response) {
        try {
            const html = responseBuffer.toString();
            const pageUrl = item.url;

            pages.push(pageUrl);
            console.log(`Scanned page: ${pageUrl}`);

            if (isContactFormPage(pageUrl, html)) {
                contactFormUrls.push(pageUrl);
                console.log(contactFormUrls);
                console.log(`Contact form detected: ${pageUrl}`);
            }

            const foundEmails = html.match(emailRegex);
            if (foundEmails) {
                const pageEmails = new Set();
                foundEmails.forEach(email => {
                    if (isValidEmail(email)) {
                        pageEmails.add(email.toLowerCase());
                    }
                });

                const emailArray = Array.from(pageEmails);
                if (emailArray.length > 0) {
                    emailsByPage[pageUrl] = emailArray;
                    console.log(`Emails found on ${pageUrl}: ${emailArray.join(', ')}`);
                }
            }

            console.log(`Processed: ${pageUrl} - Found ${foundEmails ? emailsByPage[pageUrl]?.length || 0 : 0} emails`);
        } catch (error) {
            console.error(`Error processing ${item.url}:`, error.message);
            errors.push(`Error processing ${item.url}: ${error.message}`);
        }
    });

    crawler.on('fetchclienterror', function (queueItem, response) {
        console.error(`Client error for ${queueItem.url}:`, response);
        errors.push(`Client error for ${queueItem.url}: ${response}`);
    });

    crawler.on('fetcherror', function (queueItem, response) {
        console.error(`Fetch error for ${queueItem.url}:`, response);
        errors.push(`Fetch error for ${queueItem.url}: ${response}`);
    });

    crawler.on('complete', function () {
        console.log("Crawler completed naturally");
        if (!isCompleted) {
            sendResponse(true);
        }
    });

    crawler.start();
    console.log(`Started crawling: ${normalizedUrl}`);
});