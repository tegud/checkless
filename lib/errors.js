const errors = [
    class CheckStatusExpectationError extends Error {
        constructor(message, expectedStatus, actualStatus) {
            super(message);

            this.name = "CheckExpectationError";
            this.expectedStatus = expectedStatus;
            this.actualStatus = actualStatus;
        }
    },
];

module.exports = errors.reduce((allErrors, error) => {
    allErrors[error.name] = error;
    return allErrors;
}, {});
