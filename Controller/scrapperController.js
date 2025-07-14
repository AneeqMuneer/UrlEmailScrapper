const ErrorHandler = require("../Utils/errorHandler");
const catchAsyncError = require("../Middleware/asyncError");
const Crawler = require('simplecrawler');

const { isValidEmail, emailRegex, isContactFormPage } = require("../Utils/scrapperUtils");

exports.ScrapEmails = catchAsyncError(async (req, res, next) => {
    const { Urls } = req.body;

    if (Urls.length === 0) {
        return next(new ErrorHandler("URLs are required", 400));
    }

    const normalizedUrls = Urls.map(url => {
        if (!url.startsWith('https://')) {
            return 'https://' + url;
        }
        return url;
    });

    const exclude = ['gif', 'jpg', 'jpeg', 'png', 'ico', 'bmp', 'ogg', 'webp',
        'mp4', 'webm', 'mp3', 'ttf', 'woff', 'json', 'rss', 'atom', 'gz', 'zip',
        'rar', '7z', 'css', 'js', 'gzip', 'exe', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

    const exts = exclude.join('|');
    const regex = new RegExp('\\.(' + exts + ')', 'i');

    const results = {};
    let completedUrls = 0;
    const totalUrls = normalizedUrls.length;

    const processUrl = (url) => {
        return new Promise((resolve) => {
            const emailsByPage = {};
            const pages = [];
            const contactFormUrls = [];
            const errors = [];
            let isCompleted = false;
            let crawler;

            crawler = new Crawler(url);

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

                // Force stop the crawler
                if (crawler) {
                    try {
                        crawler.stop();
                        console.log(`Crawler stopped for ${url}`);
                    } catch (error) {
                        console.error(`Error stopping crawler for ${url}:`, error);
                    }
                }

                const totalEmails = Object.values(emailsByPage).reduce((total, emails) => total + emails.length, 0);

                const emailsByPageFiltered = {};
                Object.keys(emailsByPage).forEach(pageUrl => {
                    if (emailsByPage[pageUrl].length > 0) {
                        emailsByPageFiltered[pageUrl] = emailsByPage[pageUrl];
                    }
                });

                const message = isComplete
                    ? `Successfully scraped ${pages.length} pages and found ${totalEmails} total emails`
                    : `Website couldn't be scraped completely. Found ${totalEmails} emails from ${pages.length} pages so far`;

                console.log(`Sending response for ${url}: ${message}`);
                console.log(`Pages scanned for ${url}: ${pages.join(', ')}`);
                console.log(`Contact forms found for ${url}: ${contactFormUrls.join(', ')}`);

                results[url] = {
                    totalPages: pages.length,
                    totalEmails: totalEmails,
                    emailsByPage: emailsByPageFiltered,
                    contactFormUrls: contactFormUrls,
                    totalContactForms: contactFormUrls.length,
                    scannedPages: pages,
                    errors: errors,
                    isComplete: isComplete
                };

                completedUrls++;
                resolve();
            };

            crawler.on('fetchcomplete', function (item, responseBuffer, response) {
                try {
                    const html = responseBuffer.toString();
                    const pageUrl = item.url;

                    pages.push(pageUrl);
                    console.log(`Scanned page for ${url}: ${pageUrl}`);

                    if (isContactFormPage(pageUrl, html)) {
                        contactFormUrls.push(pageUrl);
                        console.log(`Contact form detected for ${url}: ${pageUrl}`);
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
                            console.log(`Emails found on ${pageUrl} for ${url}: ${emailArray.join(', ')}`);
                        }
                    }

                    console.log(`Processed for ${url}: ${pageUrl} - Found ${foundEmails ? emailsByPage[pageUrl]?.length || 0 : 0} emails`);
                } catch (error) {
                    console.error(`Error processing ${item.url} for ${url}:`, error.message);
                    errors.push(`Error processing ${item.url}: ${error.message}`);
                }
            });

            crawler.on('fetchclienterror', function (queueItem, response) {
                console.error(`Client error for ${queueItem.url} (${url}):`, response);
                errors.push(`Client error for ${queueItem.url}: ${response}`);
            });

            crawler.on('fetcherror', function (queueItem, response) {
                console.error(`Fetch error for ${queueItem.url} (${url}):`, response);
                errors.push(`Fetch error for ${queueItem.url}: ${response}`);
            });

            crawler.on('complete', function () {
                console.log(`Crawler completed naturally for ${url}`);
                if (!isCompleted) {
                    sendResponse(true);
                }
            });

            // Add error handler for crawler
            crawler.on('error', function (error) {
                console.error(`Crawler error for ${url}:`, error);
                errors.push(`Crawler error: ${error.message}`);
                if (!isCompleted) {
                    sendResponse(false);
                }
            });

            // Start the crawler
            crawler.start();
            console.log(`Started crawling: ${url}`);
        });
    };

    // Process all URLs concurrently
    const promises = normalizedUrls.map(url => processUrl(url));

    try {
        await Promise.all(promises);

        console.log(`All URLs processed. Completed: ${completedUrls}/${totalUrls}`);

        // Check if response has already been sent
        if (res.headersSent) {
            console.log("Response already sent, skipping");
            return;
        }

        res.status(200).json({
            success: true,
            data: results,
            message: `Successfully processed ${completedUrls} URLs`
        });
    } catch (error) {
        console.error("Error processing URLs:", error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Error processing URLs",
                error: error.message
            });
        }
    }
});