const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const Crawler = require('simplecrawler');

const { isValidEmail , emailRegex } = require("../Utils/scrapperUtils");

exports.ScrapEmails = catchAsyncError(async (req, res, next) => {
    const { Url } = req.body;

    if (!Url) {
        return next(new ErrorHandler("URL is required", 400));
    }

    let normalizedUrl = Url;
    if (!Url.startsWith('https://')) {
        normalizedUrl = 'https://' + Url;
    }

    const emails = new Set();
    const pages = [];
    const errors = [];

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

    crawler.on('fetchcomplete', function (item, responseBuffer, response) {
        try {
            const html = responseBuffer.toString();
            const pageUrl = item.url;

            pages.push(pageUrl);

            const foundEmails = html.match(emailRegex);
            if (foundEmails) {
                foundEmails.forEach(email => {
                    if (isValidEmail(email)) {
                        emails.add(email.toLowerCase());
                    }
                });
            }

            console.log(`Scraped: ${pageUrl} - Found ${foundEmails ? foundEmails.length : 0} emails`);
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
        const emailArray = Array.from(emails);

        res.status(200).json({
            success: true,
            data: {
                totalPages: pages.length,
                totalEmails: emailArray.length,
                emails: emailArray,
                pages: pages,
                errors: errors
            },
            message: `Successfully scraped ${pages.length} pages and found ${emailArray.length} unique emails`
        });
    });

    crawler.start();
});