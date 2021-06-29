var db = require("../database");

const env = process.env.NODE_ENV || "development";
var config = require("../config/config.json")[env];

const { promisify } = require("util");

const axios = require("axios");
const querystring = require("querystring");
const MEDICINE_IMAGE_PATH = "http://dotrx.in/public/images/medicines/";

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
    msg = `Use ${otp} as one time password (OTP) to verify your DotRx account. Do not share this OTP to anyone for security reasons.`;
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

function getMedicineDetails(medicine_id, cb) {
  var details = {};
  db.query(
    `SELECT c.name as category, b.name as brand, m.name as medicine, m.selling_price, 
  m.buying_price as mrp, m.unit, m.unit_details,  m.description, m.prescription_required,
  m.image as front_image, m.is_active
  FROM medicines as m, categories as c, brands as b 
  WHERE m.id=? && m.category_id=c.id && m.brand_id=b.id`,
    [medicine_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to fetch medicine details : ", err);
        details.result = "failed";
        cb(details);
      } else if (results.length == 0) {
        console.log(results);
        details.result = "empty";
        cb(details);
      } else {
        // console.log(results);
        details = results[0];
        console.log(details);
        if (details.is_active == "0") {
          details.is_active = false;
        } else {
          details.is_active = true;
        }
        var salt_composition = details.salt_composition;
        if (!details.front_image) {
          details.front_image = "http://dotrx.in/images/no-image.png";
        } else {
          details.front_image =
            config.medicine_image + "/" + details.front_image;
        }
        getImages(medicine_id, function (other_images) {
          details.other_images = other_images;
          getAlternateMed(medicine_id, function (alternate_medicine) {
            details.alternate_medicine = alternate_medicine;
            getRatingsTotalAverage(
              medicine_id,
              function (rating_total_average) {
                if (rating_total_average[0].average_star_rating == null) {
                  details.average_rating = 0;
                } else {
                  details.average_rating =
                    rating_total_average[0].average_star_rating;
                }

                details.total_ratings = rating_total_average[0].total_ratings;
                details.total_reviews = rating_total_average[0].total_reviews;
                getRatingsPercent(medicine_id, function (ratings_percent) {
                  details["1_star_rate_per"] = 0;
                  details["2_star_rate_per"] = 0;
                  details["3_star_rate_per"] = 0;
                  details["4_star_rate_per"] = 0;
                  details["5_star_rate_per"] = 0;

                  for (var i = 0; i < ratings_percent.length; i++) {
                    if (ratings_percent[i].rating == 1) {
                      details["1_star_rate_per"] =
                        (ratings_percent[i].total_ratings /
                          details.total_ratings) *
                        100;
                    } else if (ratings_percent[i].rating == 2) {
                      details["2_star_rate_per"] =
                        (ratings_percent[i].total_ratings /
                          details.total_ratings) *
                        100;
                    } else if (ratings_percent[i].rating == 3) {
                      details["3_star_rate_per"] =
                        (ratings_percent[i].total_ratings /
                          details.total_ratings) *
                        100;
                    } else if (ratings_percent[i].rating == 4) {
                      details["4_star_rate_per"] =
                        (ratings_percent[i].total_ratings /
                          details.total_ratings) *
                        100;
                    } else if (ratings_percent[i].rating == 5) {
                      details["5_star_rate_per"] =
                        (ratings_percent[i].total_ratings /
                          details.total_ratings) *
                        100;
                    }
                  }
                  getRatingsCustomer(medicine_id, function (rating_customer) {
                    details.customer_ratings = rating_customer;
                    getMedicinesCustomFieldsData(
                      medicine_id,
                      function (valueMedicinesCustomFieldsData) {
                        details.medicines_custom_fields_data_value = valueMedicinesCustomFieldsData;
                        getSideEffectsData(
                          medicine_id,
                          function (valueSideEffectsData) {
                            details.salt_details = valueSideEffectsData;
                            details.result = "successful";
                            if (details.prescription_required == "0") {
                              details.prescription_required = false;
                            } else {
                              details.prescription_required = true;
                            }

                            cb(details);
                          }
                        );
                      }
                    );
                  });
                });
              }
            );
          });
        });
      }
    }
  );
}

getMedicineDetails = promisify(getMedicineDetails);

async function getWishlistStatus(user_id) {
  try {
    var wishlist_data = await db.query(
      `SELECT product_id FROM wishlist 
    WHERE user_id = ? `,
      [user_id]
    );
    var wishlist_products = [];
    wishlist_data.forEach((element) => {
      wishlist_products.push(element.product_id);
    });
    console.log(wishlist_products);
    return wishlist_products;
  } catch (err) {
    console.log(err);
    return;
  }
}

function getImages(medicine_id, cb) {
  db.query(
    `SELECT model_id, file_name FROM media  WHERE collection_name = ? && model_id = ?`,
    ["medicine_photo", medicine_id],
    function (err, results, fields) {
      if (err) {
        console.log("Getting issue while fetching images : ", err);
        cb([]);
      } else {
        var images_url = [];
        var data = results;
        console.log(data);
        for (var i = 0; i < data.length; i++) {
          if (data[i].file_name) {
            var img =
              MEDICINE_IMAGE_PATH + medicine_id + "/" + data[i].file_name;
            images_url.push(img);
          } else {
            var img = "http://dotrx.in/images/no-image.png";
            images_url.push(img);
          }
        }
        cb(images_url);
      }
    }
  );
}

function getAlternateMed(medicine_id, cb) {
  try {
    db.query(
      `SELECT alternates from medicines WHERE id=?`,
      [medicine_id],
      async function (err, results, fields) {
        if (err) {
          cb([]);
        } else {
          console.log(results);

          var ret_data = [];

          var comp_alternates = results[0].alternates;
          console.log(comp_alternates);
          if (comp_alternates) {
            var alternates = comp_alternates.split(",");
          } else {
            var alternates = [];
          }

          console.log(alternates);
          for (var i = 0; i < alternates.length; i++) {
            alternates[i] = alternates[i].trim();
            var alternates_data = await db.query(
              `SELECT id, name from medicines WHERE drug_id=?`,
              [alternates[i]]
            );
            console.log(alternates_data);

            if (alternates_data[0]) {
              var data = {};
              data.id = alternates_data[0].id || "";
              data.name = alternates_data[0].name || "";
              ret_data.push(data);
            }
          }
          console.log(ret_data);
          cb(ret_data);
        }
      }
    );
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
}

function getRatingsTotalAverage(medicine_id, cb) {
  db.query(
    `SELECT COUNT(rating) as total_ratings,  AVG(rating) as average_star_rating, COUNT(description) as total_reviews 
    FROM medicine_ratings WHERE medicine_id=? && status=?`,
    [medicine_id, 1],
    function (err, results, fields) {
      if (err) {
        cb([]);
      } else {
        cb(results);
      }
    }
  );
}

function getRatingsPercent(medicine_id, cb) {
  db.query(
    `SELECT rating, COUNT(rating) as total_ratings 
    FROM medicine_ratings WHERE medicine_id=? && status=?
    GROUP BY rating`,
    [medicine_id, 1],
    function (err, results, fields) {
      if (err) {
        cb([]);
      } else {
        console.log(results);
        cb(results);
      }
    }
  );
}

function getRatingsCustomer(medicine_id, cb) {
  db.query(
    `SELECT CONCAT(u.first_name, " ", u.last_name) as customer_name, mr.rating, mr.description as review, mr.updated_at
    FROM medicine_ratings as mr, users as u, patients as p
    WHERE mr.medicine_id=? && mr.status=? && mr.patient_id = p.id && p.user_id = u.id`,
    [medicine_id, 1],
    function (err, results, fields) {
      if (err) {
        cb([]);
      } else {
        console.log(results);
        cb(results);
      }
    }
  );
}

function getMedicinesCustomFieldsData(medicine_id, cb) {
  db.query(
    `SELECT mcfd.value, cf.field_value
    FROM custom_fields as cf, medicines_custom_fields_data as mcfd
    WHERE mcfd.medicine_id = ? && mcfd.field_name = cf.field_name && cf.status = ?`,
    [medicine_id, "1"],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        cb([]);
      } else if (results.length > 0) {
        console.log(results);
        var mcfd_value = [];
        results.forEach((element) => {
          var custom_element = {};
          custom_element[element.field_value] = element.value;
          mcfd_value.push(custom_element);
        });
        cb(mcfd_value);
      } else {
        console.log(results);
        cb([]);
      }
    }
  );
}

async function getSideEffectsData(medicine_id, cb) {
  try {
    var salt_ids = await db.query(
      `SELECT salt_id FROM salt_medicines
        WHERE medicine_id = ?`,
      [medicine_id]
    );
    console.log(salt_ids);
    var salt_details = [];
    for (var i = 0; i < salt_ids.length; i++) {
      var salt_data = await db.query(`SELECT * FROM salts WHERE id = ?`, [
        salt_ids[i].salt_id,
      ]);
      console.log(salt_data);
      if (salt_data.length) {
        // salt_details[salt_data[0].salt_name.trim()] =
        //   salt_data[0].salt_side_effects;
        salt_data[0].is_active =
          salt_data[0].is_active == null ? "" : salt_data[0].is_active;
        salt_data[0].updated_at =
          salt_data[0].updated_at == null ? "" : salt_data[0].updated_at;
        salt_data[0].created_at =
          salt_data[0].created_at == null ? "" : salt_data[0].created_at;
        salt_details.push(salt_data[0]);
      }
    }
    console.log(salt_details);
    cb(salt_details);
  } catch (err) {
    console.log("Error while getting details from salt_table ${err} :", err);
    cb([]);
  }
}

module.exports = {
  getRatings,
  getCurrentTime,
  sendOTP,
  generateOTP,
  getMedicineDetails,
  getWishlistStatus,
};
