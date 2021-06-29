var db = require("../database");
const axios = require("axios");
const querystring = require("querystring");

function generateOTP(length) {
  var result = "";
  var characters = "123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function getRatings(medicine_id) {
  try {
    var results = await db.query(
      `SELECT COUNT(rating) as total_ratings,  AVG(rating) as average_star_rating FROM 
                     medicine_ratings WHERE medicine_id=? && status=?`,
      [medicine_id, 1]
    );
    if (results[0].average_star_rating == null) {
      results[0].average_star_rating = 0;
    }
    var ratings = results[0];
    return ratings;
  } catch (err) {
    console.log(err);
    return { total_ratings: 0, average_star_rating: 0 };
  }
}

function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

async function sendOTP(otp, phoneNumber, message = null) {
  const base_url = "http://nimbusit.biz/api/SmsApi/SendSingleApi?";
  console.log(otp, message);
  var msg = "";
  if (otp !== null) {
    msg = `Use ${otp} as one time password (OTP) to login your DotRx account. Do not share this OTP to anyone for security reasons.`;
  } else {
    msg = message;
  }
  const q = {
    UserID: "zynastycomm",
    Password: "hauc3763HA",
    SenderID: "ZYCORX",
    Phno: phoneNumber,
    EntityID: "1201160831013589969",
    Msg: msg,
  };

  const encode_query = querystring.stringify(q);
  const url = base_url + encode_query;
  console.log(`SMS URL : ${url}`);
  const response = await axios.get(url);
  const status = response.status;
  console.log(`Status : ${status}`);
  return status == 200 ? true : false;
}

module.exports = { getRatings, getCurrentTime, sendOTP, generateOTP };
