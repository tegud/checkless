const AWS = require("aws-sdk-mock");
const { makeRequest } = require("../make-request");
const express = require("express");
const http = require("http");

function HttpServer(port = 3012) {
    const app = express();
    const httpServer = http.createServer(app);
    let statusCode = 200;
    let lastUserAgent;

    app.use((req, res) => {
        lastUserAgent = req.headers["user-agent"];

        res.status(statusCode);
        res.json({});
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

    it("sends a message to SNS when successful", (done) => {
        let parsedMessage;
        AWS.mock("SNS", "publish", (msg, callback) => {
            parsedMessage = JSON.parse(msg.Message);
            delete parsedMessage.timeToFirstByte;
            callback();
        });

        makeRequest({
            url: "http://localhost:3012",
            region: "eu-west-1",
            snsTopic: "complete",
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

        makeRequest({
            url: "http://localhost:3012",
            timeout: 1,
            region: "eu-west-1",
            snsTopic: "complete",
        }, {
            invokedFunctionArn: "arn:aws:lambda:us-east-1:accountId",
        }, () => {
            expect(parsedMessage).toEqual({
                url: "http://localhost:3012",
                errorMessage: "Timeout after 1ms from url: http://localhost:3012",
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

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3012",
                region: "eu-west-1",
                snsTopic: "complete",
            }, { invokedFunctionArn: "arn:aws:lambda:region:accountId" }, () => {
                expect(parsedMessage).toEqual({
                    url: "http://localhost:3012",
                    statusCode: 503,
                    errorMessage: "Error response code 503",
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

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3013",
                region: "eu-west-1",
                snsTopic: "complete",
            }, {
                invokedFunctionArn: "arn:aws:lambda:region:accountId",
            }, () => {
                expect(parsedMessage).toEqual({
                    url: "http://localhost:3013",
                    errorMessage: "Could not connect",
                    success: false,
                    timeout: 3000,
                    region: "region",
                    location: "region",
                });

                done();
            }));
    });

    it("sets user-agent to lambda-overwatch", (done) => {
        AWS.mock("SNS", "publish", (msg, callback) => callback());

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3012",
                region: "eu-west-1",
                snsTopic: "complete",
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

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3012",
                snsTopic: "complete",
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

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3012",
                homeRegion: "eu-west-1",
                snsTopic: "complete",
            }, { invokedFunctionArn: "arn:aws:lambda:us-east-1:accountId" }, () => {
                expect(topicArn).toBe("arn:aws:sns:eu-west-1:accountId:complete");

                done();
            }));
    });
});
