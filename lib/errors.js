const errors = [
    class CheckStatusExpectationError extends Error {
        constructor(expectedStatus, actualStatus) {
            super(`Received status ${actualStatus}, expected ${expectedStatus}`);

            this.name = "CheckExpectationError";
            this.expectedStatus = expectedStatus;
            this.actualStatus = actualStatus;
            this.failureReasons = ["statusCode"];
        }
    },
];

module.exports = errors.reduce((allErrors, error) => {
    allErrors[error.name] = error;
    return allErrors;
}, {});
