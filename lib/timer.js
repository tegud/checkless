module.exports = function Timer() {
    let start;
    let end;

    return {
        start: () => {
            start = new Date().valueOf();
        },
        stop: () => {
            end = new Date().valueOf();
            return end - start;
        },
    };
};
