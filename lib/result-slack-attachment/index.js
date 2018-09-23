const propertyFieldTitles = {
    url: "URL",
    errorMessage: {
        text: "Error",
        short: false,
    },
    timeToFirstByte: {
        text: "Time to First Byte",
        formatter: value => `${value}ms`,
    },
    location: {
        text: "Location",
        formatter: (value, result) => `${value} (${result.region})`,
    },
};

const getField = (property, result) => {
    const current = propertyFieldTitles[property];

    if (typeof (current) === "string") {
        return {
            title: current,
            value: result[property],
            short: true,
        };
    }

    return {
        title: current.text,
        value: current.formatter ? current.formatter(result[property], result) : result[property],
        short: typeof current.short === "undefined" ? true : current.short,
    };
};

module.exports = {
    buildAttachments: result => [
        {
            fallback: `Site check result: ${result.url}, ${result.region} ${result.success ? "was successful" : "failed"}.${result.errorMessage ? " " : ""}${result.errorMessage || ""}`,
            title: `Site check ${result.url} ${result.success ? "Successful" : "Failed"}.`,
            color: result.success ? "good" : "danger",
            fields: Object.keys(propertyFieldTitles).reduce((fields, currentProperty) => {
                if (!result[currentProperty]) {
                    return fields;
                }

                return [...fields, getField(currentProperty, result)];
            }, []),
        },
    ],
};
