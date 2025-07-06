const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const Crawler = require('simplecrawler');

const { isValidEmail, emailRegex } = require("../Utils/scrapperUtils");

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
    const errors = [];
    let isCompleted = false;
    let timeoutId;

    const exclude = ['gif', 'jpg', 'jpeg', 'png', 'ico', 'bmp', 'ogg', 'webp',
        'mp4', 'webm', 'mp3', 'ttf', 'woff', 'json', 'rss', 'atom', 'gz', 'zip',
        'rar', '7z', 'css', 'js', 'gzip', 'exe', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

    const exts = exclude.join('|');
    const regex = new RegExp('\\.(' + exts + ')', 'i');

    const crawler = new Crawler(normalizedUrl);

    crawler.maxDepth = 3;
    crawler.maxConcurrency = 5;
    crawler.respectRobotsTxt = true;
    crawler.userAgent = 'EmailScraper/1.0';

    crawler.addFetchCondition(function (parsedURL) {
        return !parsedURL.path.match(regex);
    });

    // Function to send response
    const sendResponse = (isComplete = false) => {
        if (isCompleted) return; // Prevent multiple responses

        isCompleted = true;
        clearTimeout(timeoutId);

        // Calculate total emails across all pages
        const totalEmails = Object.values(emailsByPage).reduce((total, emails) => total + emails.length, 0);

        // Filter out pages with no emails
        const emailsByPageFiltered = {};
        Object.keys(emailsByPage).forEach(url => {
            if (emailsByPage[url].length > 0) {
                emailsByPageFiltered[url] = emailsByPage[url];
            }
        });

        const message = isComplete
            ? `Successfully scraped ${pages.length} pages and found ${totalEmails} total emails`
            : `Website couldn't be scraped completely. Found ${totalEmails} emails from ${pages.length} pages so far`;

        res.status(200).json({
            success: true,
            data: {
                totalPages: pages.length,
                totalEmails: totalEmails,
                emailsByPage: emailsByPageFiltered,
                errors: errors,
                isComplete: isComplete
            },
            message: message
        });
    };

    // Set timeout for 1 minute (60000ms)
    timeoutId = setTimeout(() => {
        if (!isCompleted) {
            sendResponse(false);
        }
    }, 60000);

    crawler.on('fetchcomplete', function (item, responseBuffer, response) {
        try {
            const html = responseBuffer.toString();
            const pageUrl = item.url;

            pages.push(pageUrl);

            // Extract emails from HTML content
            const foundEmails = html.match(emailRegex);
            if (foundEmails) {
                // Filter and store unique emails for this page
                const pageEmails = new Set();
                foundEmails.forEach(email => {
                    if (isValidEmail(email)) {
                        pageEmails.add(email.toLowerCase());
                    }
                });

                // Only store if emails were found
                const emailArray = Array.from(pageEmails);
                if (emailArray.length > 0) {
                    emailsByPage[pageUrl] = emailArray;
                }
            }

            console.log(`Scraped: ${pageUrl} - Found ${foundEmails ? emailsByPage[pageUrl]?.length || 0 : 0} emails`);
        } catch (error) {
            errors.push(`Error processing ${item.url}: ${error.message}`);
        }
    });

    crawler.on('fetchclienterror', function (queueItem, response) {
        errors.push(`Client error for ${queueItem.url}: ${response}`);
    });

    crawler.on('fetcherror', function (queueItem, response) {
        errors.push(`Fetch error for ${queueItem.url}: ${response}`);
    });

    crawler.on('complete', function () {
        if (!isCompleted) {
            sendResponse(true);
        }
    });

    crawler.start();
});