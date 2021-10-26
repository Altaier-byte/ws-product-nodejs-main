const requestIp = require('request-ip');

// Store previous requests
const requestLogs = {};

// Configure limiter by setting the time limit and the number of allowed requests in that time limit
const limitTimeMS = 30000;
const limitNoOfRequests = 10;

/**
 * @function
 * @name findPreviousRequests
 * @summary Given a sorted array find all the items larger than requested item for example find all the times after 8:01PM, etc - complexit is O(log N) because it's binary search
 * @param {array} arr Sorted times array
 * @param {number} searchItem Item to search for items after it
 * @throws {string} errorMessage
 */
const findPreviousRequests = function findPreviousRequests(arr, searchItem) {
  try {
    const arrayLength = arr.length;
    let left = 0;
    let right = arrayLength - 1;

    // Stores the index of the left element from the array which is greater than searchItem
    let leftGreater = arrayLength;


    // Finds number of elements greater than searchItem
    while (left <= right) {
      let middle = left + parseInt((right - left) / 2);

      // If mid element is greater than the searchItem update leftGreater and right
      if (arr[middle] > searchItem) {
        leftGreater = middle;
        right = middle - 1;
      }

      // If mid element is less than or equal to the searchItem then update left
      else
        left = middle + 1;
    }

    // Return an array of items larger than the searchItem
    return (arr.slice(leftGreater))
  } catch (error) {
    throw new Error(`Something went wrong while looking for previous requests ${error}`);
  }
}

/**
 * @function
 * @name checkRate
 * @summary Check rate before serving an api per client
 * @param {object} req http request
 * @param {object} res http response
 * @param {function} next Next function upon success
 * @throws {string} errorMessage
 */
const checkRate = (req, res, next) => {
  try {
    // Extract the ip address of the request
    const clientIp = requestIp.getClientIp(req);

    // Get the current time for the request, and calculate the maximum allowed time
    const currentTimeMS = Date.now();
    const maxmimumTimeMS = currentTimeMS - limitTimeMS;

    if (!requestLogs[clientIp]) {
      // Handle the case if this is the first request from this client
      requestLogs[clientIp] = [currentTimeMS];
      next();
    } else {
      // Handle the case if this is not the first request from this client
      // Then get all the previous requests of this client after the current time
      const previousRequests = findPreviousRequests(requestLogs[clientIp], maxmimumTimeMS);

      // Update this client's requests by deleting old requests pirror to the current time, so the array does not go big
      requestLogs[clientIp] = [...previousRequests, currentTimeMS];

      // Check if the previous requests after the current time less than the allowed number, if yes continue, else throw an error
      if (previousRequests.length < limitNoOfRequests) {
        next();
      } else {
        throw new Error('Number of requests reached limits, please try again later');
      }
    }
  } catch (error) {
    // Return an error with status code 429 to inidicate rate limit reached
    res.status(429).send(error.message);
  }
}

module.exports = {
  checkRate
}
