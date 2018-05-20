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
        AWS.mock("SNS", "publish", (msg) => {
            const parsedMessage = JSON.parse(msg.Message);
            delete parsedMessage.timeToFirstByte;

            expect(parsedMessage).toEqual({
                url: "http://localhost:3012",
                statusCode: 200,
                success: true,
                timeout: 3000,
            });

            done();
        });

        makeRequest({
            url: "http://localhost:3012",
            region: "eu-west-1",
            snsTopic: "complete",
        }, {
            invokedFunctionArn: "arn:aws:lambda:region:accountId",
        }, () => {});
    });

    it("sends a message to SNS when request timed out", (done) => {
        AWS.mock("SNS", "publish", (msg) => {
            const parsedMessage = JSON.parse(msg.Message);
            delete parsedMessage.timeToFirstByte;

            expect(parsedMessage).toEqual({
                url: "http://localhost:3012",
                errorMessage: "Timeout after 1ms from url: http://localhost:3012",
                success: false,
                timeout: 1,
            });

            done();
        });

        makeRequest({
            url: "http://localhost:3012",
            timeout: 1,
            region: "eu-west-1",
            snsTopic: "complete",
        }, {
            invokedFunctionArn: "arn:aws:lambda:region:accountId",
        }, () => {});
    });

    it("sends a message to SNS when server responds with non-200", (done) => {
        AWS.mock("SNS", "publish", (msg) => {
            const parsedMessage = JSON.parse(msg.Message);
            delete parsedMessage.timeToFirstByte;

            expect(parsedMessage).toEqual({
                url: "http://localhost:3012",
                statusCode: 503,
                errorMessage: "Error response code 503",
                success: false,
                timeout: 3000,
            });

            done();
        });

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3012",
                region: "eu-west-1",
                snsTopic: "complete",
            }, { invokedFunctionArn: "arn:aws:lambda:region:accountId" }, () => { }));
    });

    it("sends a message to SNS when server does not respond on port", (done) => {
        AWS.mock("SNS", "publish", (msg) => {
            const parsedMessage = JSON.parse(msg.Message);
            delete parsedMessage.timeToFirstByte;

            expect(parsedMessage).toEqual({
                url: "http://localhost:3013",
                errorMessage: "Could not connect",
                success: false,
                timeout: 3000,
            });

            done();
        });

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3013",
                region: "eu-west-1",
                snsTopic: "complete",
            }, { invokedFunctionArn: "arn:aws:lambda:region:accountId" }, () => {}));
    });

    it("sets user-agent to lambda-overwatch", (done) => {
        AWS.mock("SNS", "publish", () => {
            expect(httpServer.getLastUserAgent()).toBe(`checkless/1.0 (aws-lambda node-js/${process.version})`);

            done();
        });

        httpServer.setStatusCode(503)
            .then(() => makeRequest({
                url: "http://localhost:3012",
                region: "eu-west-1",
                snsTopic: "complete",
            }, {
                invokedFunctionArn: "arn:aws:lambda:region:accountId",
            }, () => {}));
    });
});
