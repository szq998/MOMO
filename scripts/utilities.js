// make sure loading indicator will not flash
function elegantlyFinishLoading(
    scheduled,
    appearTime,
    leastDuration,
    callBackWhenFinished = null,
    callBackToStopLoading = null
) {
    if (appearTime) {
        const lastingTime = Date.now() - appearTime;
        const remainingTime =
            leastDuration - lastingTime < 0 ? 0 : leastDuration - lastingTime;
        setTimeout(() => {
            if (callBackToStopLoading) {
                callBackToStopLoading();
            }
            if (callBackWhenFinished) {
                callBackWhenFinished();
            }
        }, remainingTime);
    } else {
        clearTimeout(scheduled);
        if (callBackWhenFinished) {
            callBackWhenFinished();
        }
    }
}

function getTimeInfo(ts) {
    // timestamp with unit of SECOND
    if (ts === 0) {
        return '新添加';
    }
    const nowTs = Math.round(Date.now() / 1000);
    const diff = nowTs - ts;
    if (diff < 60) {
        return '刚才';
    } else if (diff < 60 * 60) {
        const min = Math.round(diff / 60);
        return `${min}分钟前`;
    } else if (diff < 60 * 60 * 24) {
        const hour = Math.round(diff / (60 * 60));
        return `${hour}小时前`;
    } else if (diff < 60 * 60 * 24 * 100) {
        // less than 100 days
        const day = Math.round(diff / (60 * 60 * 24));
        return `${day}天前`;
    } else if (diff < 60 * 60 * 24 * 365) {
        // less than 1 years
        let month = new Date().getMonth() - new Date(ts * 1000).getMonth();
        month = month < 0 ? month + 12 : month;
        return `${month}月前`;
    } else {
        // more than 1 years
        let year = new Date().getFullYear() - new Date(ts * 1000).getFullYear();
        year = year < 0 ? 1 : year;
        return `${year}年前`;
    }
}

module.exports = {
    elegantlyFinishLoading,
    getTimeInfo,
};
