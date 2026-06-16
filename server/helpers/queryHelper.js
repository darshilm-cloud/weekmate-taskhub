const { statusCode } = require("./constant");
const resMsg = require("./messages");

const removeSpecialCharFromSearch = (search) => {
  if (!search) return "";
  return search
    .trim()
    .replace(/\!/g, "\\!")
    .replace(/\@/g, "\\@")
    .replace(/\#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/\%/g, "\\%")
    .replace(/\^/g, "\\^")
    .replace(/\&/g, "\\&")
    .replace(/\*/g, "\\*")
    .replace(/\)/g, "\\)")
    .replace(/\(/g, "\\(")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\;/g, "\\;")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\,/g, "\\,");
};

const getPagination = (queryParams) => {
  return {
    page: queryParams.pageNum,
    limit: queryParams.pageLimit,
    skip: queryParams.pageLimit * (queryParams.pageNum - 1),
    sort: { [queryParams.sort]: queryParams.sortBy == "asc" ? 1 : -1 },
  };
};

const getAggregationPagination = (mainQuery, paginationObj) => {
  return [
    ...mainQuery,
    ...[
      { $sort: paginationObj.sort },
      { $skip: paginationObj.skip },
      { $limit: paginationObj.limit },
    ],
  ];
};

const getPaginationResult = (pageNo, limit) => {
  const skip = (pageNo - 1) * limit;
  return [
    {
      $facet: {
        metadata: [{ $count: "total" }, { $addFields: { pageNo: pageNo, limit: limit } }],
        data: [{ $skip: skip }, { $limit: limit }]
      }
    }
  ];
};

const getTotalCountQuery = (mainQuery) => {
  return [
    ...mainQuery,
    ...[
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ],
  ];
};

const searchDataArr = (searchProps, searchKey) => {
  const orFilter = [];
  searchProps.forEach((s) => {
    orFilter.push({
      [s]: {
        $regex: removeSpecialCharFromSearch(searchKey),
        $options: "i",
      },
    });
  });

  return orFilter.length > 0 ? { ["$or"]: orFilter } : {};
};

module.exports = {
  getPagination,
  getAggregationPagination,
  getPaginationResult,
  getTotalCountQuery,
  searchDataArr,
  removeSpecialCharFromSearch,
};
