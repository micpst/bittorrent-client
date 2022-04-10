export const chunk = (iterable, chunkSize) =>
    [...Array(Math.ceil(iterable.length / chunkSize)).keys()]
        .map(begin => iterable.subarray(begin, begin + chunkSize));