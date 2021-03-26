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

module.exports = {
    elegantlyFinishLoading,
};
