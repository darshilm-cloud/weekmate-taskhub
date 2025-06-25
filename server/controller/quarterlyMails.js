const mongoose = require("mongoose");
const QuarterlyMails = mongoose.model("quarterlyhourmails");

// (mailIds, mailData)
exports.mailsToQuarterHours = async (mailIds, mailData) => {
  try {
    let data = new QuarterlyMails({
      mailids: mailIds,
      maildata: mailData,
      isSent: false,
    });

    await data.save();

    return data;
  } catch (error) {
    console.log("🚀 ~ exports.mailsToQuarterHours= ~ error:", error)    
    return false;
  }
};
// (req, res)
exports.updateSentMails = async (id) => {
  try {
    let data = await QuarterlyMails.updateOne(
      {
        _id: new mongoose.Types.ObjectId(id),
      },
      {
        $set: {
          isSent: true,
        },
      },
      { new: true }
    );

    return data;
  } catch (error) {
    console.log("🚀 ~ exports.updateSentMails= ~ error:", error)    
    return false;
  }
};

exports.getQuarterlyMails = async () => {
  try {
    const fourHoursAgo = moment().subtract(4, "hours").toDate();
    const mainQuery = [
      {
        $match: {
          isSent: false,
          createdAt: {
            $gte: fourHoursAgo,
          },
        },
      },
      {
        $project: {
          mailids: 1,
          maildata: 1,
          isSent: 1,
        },
      },
    ];
    const data = await QuarterlyMails.aggregate(mainQuery);
    
    return data;
  } catch (error) {
    console.log("🚀 ~ exports.getQuarterlyMails= ~ error:", error)    
    return false;
  }
};
