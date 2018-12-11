const AWS = require("aws-sdk-mock");
const { handleRequest } = require("../handle-request");

let currentDate;

Date.now = jest.fn(() => currentDate);

describe("make-request", () => {
    afterEach(() => {
        AWS.restore("SNS", "publish");
        currentDate = undefined;
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

        describe("stores results when configured to", () => {
            afterEach(() => {
                AWS.restore("DynamoDB.DocumentClient", "put");
            });

            it("puts to dynamodb", (done) => {
                let dynamoDbPutCalled;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    callback();
                });

                AWS.mock("DynamoDB.DocumentClient", "put", (params, callback) => {
                    dynamoDbPutCalled = true;
                    callback(null, "successfully put item in database");
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

                process.env.storeResult = true;
                process.env.failedSnsTopic = "failed";

                handleRequest(event, context, () => {
                    expect(dynamoDbPutCalled).toBeTruthy();

                    done();
                });
            });

            it("table name is prefixed with checkless by default", (done) => {
                let tableName;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    callback();
                });

                AWS.mock("DynamoDB.DocumentClient", "put", (params, callback) => {
                    tableName = params.TableName;
                    callback(null, "successfully put item in database");
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

                process.env.storeResult = true;
                process.env.failedSnsTopic = "failed";

                handleRequest(event, context, () => {
                    expect(tableName).toBe("checkless_lastResult");

                    done();
                });
            });

            it("table name is prefixed with service name when set", (done) => {
                let tableName;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    callback();
                });

                AWS.mock("DynamoDB.DocumentClient", "put", (params, callback) => {
                    tableName = params.TableName;
                    callback(null, "successfully put item in database");
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

                process.env.storeResult = true;
                process.env.failedSnsTopic = "failed";
                process.env.service = "my";

                handleRequest(event, context, () => {
                    expect(tableName).toBe("my_lastResult");

                    done();
                });
            });

            it("Item is set to result record", (done) => {
                let item;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    callback();
                });

                AWS.mock("DynamoDB.DocumentClient", "put", (params, callback) => {
                    item = params.Item;
                    callback(null, "successfully put item in database");
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

                process.env.storeResult = true;
                process.env.failedSnsTopic = "failed";
                process.env.service = "my";

                handleRequest(event, context, () => {
                    expect(item.success).toBeTruthy();

                    done();
                });
            });
        });

        describe("result history", () => {
            it("Stored Item lastStateChange is set to now when no previous record", (done) => {
                let item;

                AWS.mock("SNS", "publish", (msg, callback) => {
                    callback();
                });

                AWS.mock("DynamoDB.DocumentClient", "put", (params, callback) => {
                    item = params.Item;
                    callback(null, "successfully put item in database");
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

                currentDate = "2018-12-11T07:11:00Z";

                const context = {
                    invokedFunctionArn: "arn:aws:lambda:eu-west-1:accountId",
                };

                process.env.storeResult = true;

                handleRequest(event, context, () => {
                    expect(item.lastStateChange).toBe("2018-12-11T07:11:00+00:00");

                    done();
                });
            });
        });
    });
});
