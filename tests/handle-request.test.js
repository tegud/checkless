const AWS = require("aws-sdk-mock");
const { handleRequest } = require("../handle-request");

describe("make-request", () => {
    afterEach(() => {
        AWS.restore("SNS", "publish");
    });

    describe("handle request", () => {
        describe("sends to SNS topics", () => {
            it("sends a message to Complete SNS when successful", (done) => {
                let parsedMessage;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    parsedMessage = JSON.parse(msg.Message);
                    callback();
                });

                const event = {
                    Records: [
                        {
                            Sns: {
                                Message: "{ \"success\": true }",
                            },
                        },
                    ],
                };

                const context = {
                    invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
                };

                handleRequest(event, context, () => {
                    expect(parsedMessage).toEqual({
                        success: true,
                    });

                    done();
                });
            });

            it("sends a message to configured SNS topic arn when successful", (done) => {
                let topicArn;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    topicArn = msg.TopicArn;
                    callback();
                });

                process.env.completeSnsTopic = "complete";

                const event = {
                    Records: [
                        {
                            Sns: {
                                Message: "{ \"success\": true }",
                            },
                        },
                    ],
                };

                const context = {
                    invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
                };

                handleRequest(event, context, () => {
                    expect(topicArn).toEqual("arn:aws:sns:eu-west-1:accountId:complete");

                    done();
                });
            });

            it("sends a message to failed SNS when failed", (done) => {
                let parsedMessage;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    if (!msg.TopicArn.endsWith("failed")) {
                        return callback();
                    }

                    parsedMessage = JSON.parse(msg.Message);
                    return callback();
                });

                const event = {
                    Records: [
                        {
                            Sns: {
                                Message: "{ \"success\": false }",
                            },
                        },
                    ],
                };

                const context = {
                    invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
                };

                process.env.failedSnsTopic = "failed";

                handleRequest(event, context, () => {
                    expect(parsedMessage).toEqual({
                        success: false,
                    });

                    done();
                });
            });

            it("sends a message to configured SNS topic arn when failed", (done) => {
                let topicArn;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    if (!msg.TopicArn.endsWith("failed")) {
                        return callback();
                    }

                    topicArn = msg.TopicArn;
                    return callback();
                });

                process.env.failedSnsTopic = "failed";

                const event = {
                    Records: [
                        {
                            Sns: {
                                Message: "{ \"success\": false }",
                            },
                        },
                    ],
                };

                const context = {
                    invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
                };

                handleRequest(event, context, () => {
                    expect(topicArn).toEqual("arn:aws:sns:eu-west-1:accountId:failed");

                    done();
                });
            });

            it("sends errorMessage to failed SNS when failed set", (done) => {
                let parsedMessage;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    if (!msg.TopicArn.endsWith("failed")) {
                        return callback();
                    }

                    parsedMessage = JSON.parse(msg.Message);
                    return callback();
                });

                const event = {
                    Records: [
                        {
                            Sns: {
                                Message: "{ \"success\": false, \"errorMessage\": \"ERROR\" }",
                            },
                        },
                    ],
                };

                const context = {
                    invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
                };

                process.env.failedSnsTopic = "failed";

                handleRequest(event, context, () => {
                    expect(parsedMessage).toEqual("ERROR");

                    done();
                });
            });
        });
    });
});
