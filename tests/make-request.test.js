const AWS = require("aws-sdk-mock");
const { makeRequest } = require("../make-request");
const express = require("express");
const http = require("http");

function HttpServer(port = 3012) {
    const app = express();
    const httpServer = http.createServer(app);
    let statusCode = 200;
    let lastUserAgent;

    app.get("/", (req, res) => {
        lastUserAgent = req.headers["user-agent"];

        res.status(statusCode);
        res.json({});
    });

    app.get("/redirect", (req, res) => {
        lastUserAgent = req.headers["user-agent"];

        res.redirect("/", 302);
    });

    return {
        start: () => new Promise((resolve, reject) => httpServer.listen(port, (err) => {
            if (err) {
                return reject(err);
            }

            console.log(`Listening on port ${port}`);

            return resolve();
        })),
        stop: () => Promise.resolve(httpServer.close()),
        setStatusCode: (newCode) => {
            statusCode = newCode;
            return Promise.resolve();
        },
        getLastUserAgent: () => lastUserAgent,
    };
}

describe("make-request", () => {
    let httpServer;

    beforeEach(() => {
        httpServer = new HttpServer();
        return httpServer.start();
    });

    afterEach(() => {
        AWS.restore("SNS", "publish");
        return httpServer.stop();
    });

    describe("scheduled events", () => {
        it("sends a message to SNS when successful", (done) => {
            let parsedMessage;
            AWS.mock("SNS", "publish", (msg, callback) => {
                parsedMessage = JSON.parse(msg.Message);
                delete parsedMessage.timeToFirstByte;
                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            makeRequest({
                url: "http://localhost:3012",
            }, {
                invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
            }, (err) => {
                console.log(err);

                expect(parsedMessage).toEqual({
                    url: "http://localhost:3012",
                    statusCode: 200,
                    success: true,
                    timeout: 3000,
                    region: "eu-west-1",
                    location: "Ireland",
                });

                done();
            });
        });

        it("sends a message to SNS when request timed out", (done) => {
            let parsedMessage;

            AWS.mock("SNS", "publish", (msg, callback) => {
                parsedMessage = JSON.parse(msg.Message);
                delete parsedMessage.timeToFirstByte;

                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            makeRequest({
                url: "http://localhost:3012",
                timeout: 1,
            }, {
                invokedFunctionArn: "arn:aws:lambda:us-east-1:accountId",
            }, () => {
                expect(parsedMessage).toEqual({
                    url: "http://localhost:3012",
                    errorMessage: "Timeout after 1ms from url: http://localhost:3012",
                    failureReasons: ["timeout"],
                    success: false,
                    timeout: 1,
                    region: "us-east-1",
                    location: "North Virginia",
                });

                done();
            });
        });

        it("sends a message to SNS when server responds with non-200", (done) => {
            let parsedMessage;

            AWS.mock("SNS", "publish", (msg, callback) => {
                parsedMessage = JSON.parse(msg.Message);
                delete parsedMessage.timeToFirstByte;
                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            httpServer.setStatusCode(503)
                .then(() => makeRequest({
                    url: "http://localhost:3012",
                }, { invokedFunctionArn: "arn:aws:lambda:region:accountId" }, () => {
                    expect(parsedMessage).toEqual({
                        url: "http://localhost:3012",
                        statusCode: 503,
                        errorMessage: "Received status 503, expected 200",
                        failureReasons: ["statusCode"],
                        success: false,
                        timeout: 3000,
                        region: "region",
                        location: "region",
                    });

                    done();
                }));
        });

        it("sends a message to SNS when server does not respond on port", (done) => {
            let parsedMessage;
            AWS.mock("SNS", "publish", (msg, callback) => {
                parsedMessage = JSON.parse(msg.Message);
                delete parsedMessage.timeToFirstByte;

                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            httpServer.setStatusCode(503)
                .then(() => makeRequest({
                    url: "http://localhost:3013",
                }, {
                    invokedFunctionArn: "arn:aws:lambda:region:accountId",
                }, () => {
                    expect(parsedMessage).toEqual({
                        url: "http://localhost:3013",
                        errorMessage: "Could not connect",
                        failureReasons: [],
                        success: false,
                        timeout: 3000,
                        region: "region",
                        location: "region",
                    });

                    done();
                }));
        });

        it("sets user-agent to checkless", (done) => {
            AWS.mock("SNS", "publish", (msg, callback) => callback());

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            httpServer.setStatusCode(503)
                .then(() => makeRequest({
                    url: "http://localhost:3012",
                }, {
                    invokedFunctionArn: "arn:aws:lambda:region:accountId",
                }, () => {
                    expect(httpServer.getLastUserAgent()).toBe(`checkless/1.0 (aws-lambda node-js/${process.version})`);

                    done();
                }));
        });

        it("sends to the region sns if homeRegion is not set", (done) => {
            let topicArn;

            AWS.mock("SNS", "publish", (msg, callback) => {
                topicArn = msg.TopicArn;
                callback();
            });

            process.env.handleRequestTopic = "complete";

            httpServer.setStatusCode(503)
                .then(() => makeRequest({
                    url: "http://localhost:3012",
                }, { invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId" }, () => {
                    expect(topicArn).toBe("arn:aws:sns:eu-west-1:accountId:complete");

                    done();
                }));
        });

        it("sends to the homeRegion sns if set", (done) => {
            let topicArn;

            AWS.mock("SNS", "publish", (msg, callback) => {
                topicArn = msg.TopicArn;
                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            httpServer.setStatusCode(503)
                .then(() => makeRequest({
                    url: "http://localhost:3012",
                }, { invokedFunctionArn: "arn:aws:lambda:us-east-1:accountId" }, () => {
                    expect(topicArn).toBe("arn:aws:sns:eu-west-1:accountId:complete");

                    done();
                }));
        });
    });

    describe("sns events", () => {
        it("sends a message to SNS when successful", (done) => {
            let parsedMessage;
            AWS.mock("SNS", "publish", (msg, callback) => {
                parsedMessage = JSON.parse(msg.Message);
                delete parsedMessage.timeToFirstByte;
                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            makeRequest({
                Records: [
                    {
                        EventSource: "aws:sns",
                        EventVersion: "1.0",
                        EventSubscriptionArn: "arn:aws:sns:eu-west-1:12343534:checkless-make-request:85a2143f-8ea1-4e6a-b251-d19f4227e929",
                        Sns: {
                            Type: "Notification",
                            MessageId: "d30de223-a5da-5282-9903-b1ecdb151c23",
                            TopicArn: "arn:aws:sns:eu-west-1:12343534:checkless-make-request",
                            Subject: "trigger-check",
                            Message: "{\"url\":\"http://localhost:3012\"}",
                        },
                    },
                ],
            }, {
                invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
            }, (err) => {
                console.log(err);

                expect(parsedMessage).toEqual({
                    url: "http://localhost:3012",
                    statusCode: 200,
                    success: true,
                    timeout: 3000,
                    region: "eu-west-1",
                    location: "Ireland",
                });

                done();
            });
        });
    });


    describe("follow redirect", () => {
        it("follows redirects by default", (done) => {
            let parsedMessage;
            AWS.mock("SNS", "publish", (msg, callback) => {
                parsedMessage = JSON.parse(msg.Message);
                delete parsedMessage.timeToFirstByte;
                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            httpServer.setStatusCode(200);

            makeRequest({
                url: "http://localhost:3012/redirect",
            }, {
                invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
            }, (err) => {
                console.log(err);

                expect(parsedMessage).toEqual({
                    url: "http://localhost:3012/redirect",
                    statusCode: 200,
                    success: true,
                    timeout: 3000,
                    region: "eu-west-1",
                    location: "Ireland",
                });

                done();
            });
        });

        it("does not follows redirect when configured", (done) => {
            let parsedMessage;
            AWS.mock("SNS", "publish", (msg, callback) => {
                parsedMessage = JSON.parse(msg.Message);
                delete parsedMessage.timeToFirstByte;
                callback();
            });

            process.env.homeRegion = "eu-west-1";
            process.env.handleRequestTopic = "complete";

            httpServer.setStatusCode(200);

            makeRequest({
                url: "http://localhost:3012/redirect",
                followRedirect: false,
                statusCode: 302,
            }, {
                invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
            }, (err) => {
                console.log(err);

                expect(parsedMessage).toEqual({
                    url: "http://localhost:3012/redirect",
                    statusCode: 302,
                    success: true,
                    timeout: 3000,
                    region: "eu-west-1",
                    location: "Ireland",
                });

                done();
            });
        });
    });
});
