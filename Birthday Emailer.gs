const data = SpreadsheetApp.openById("[INSERT ID HERE]").getSheets()[0].getDataRange().getValues();
var isBirthdayToday = false;

function main() {
if (PropertiesService.getScriptProperties().getProperty("sentUntil") > 0) {
PropertiesService.getScriptProperties().setProperty("sentUntil", PropertiesService.getScriptProperties().getProperty("sentUntil") - 1);
console.log("Today's birthdays were already sent, exiting...");
return; //this should be "continue" when testing! (not "return") 
}
var today = new Date();  // date format: "3/29/2022" (with quotes)
console.log(today);
const hebrewDate = getHebrewDate(today);
console.log(hebrewDate.get("Day"), hebrewDate.get("Month"));
var createdOneTimeEvent = false;
for (var i in data) {
if (i == 0 || data[i][0] == "") {continue;}
  // if erev Pesach, erev Shmini Shel Pesach, or erev Shavuos is Shabbos, send next three days on Friday (Rosh Hashana Sukkos, and Shmini Atzeres can't be on a Sunday)
if ((hebrewDate.get("Month") == "Nisan" && hebrewDate.get("Day") == 13 && today.getDay() == 5) ||
(hebrewDate.get("Month") == "Nisan" && hebrewDate.get("Day") == 19 && today.getDay() == 5) ||
(hebrewDate.get("Month") == "Sivan" && hebrewDate.get("Day") == 5 && today.getDay() == 5))  {
  if (formatDay(addDays(today, 1)) == formatDay(data[i][0]) || (formatDay(addDays(today, 2)) == formatDay(data[i][0]))) {
      sendEmail(i, `Happy (early)`);
        }
  if (!createdOneTimeEvent) {createOneTimeEvent((today.getDay() + 3) % 7, 22); createdOneTimeEvent = true;}
  PropertiesService.getScriptProperties().setProperty("sentUntil", 3);
  }
// send both days of of Yom Tov on Erev Yom (Rosh Hashana, Sukkos, Shmini Atzeres, Pesach, Shmini Shel Pesach, and Shavuos)
else {
  if ((hebrewDate.get("Month") == "Elul" && hebrewDate.get("Day") == 29) ||
    (hebrewDate.get("Month") == "Tishrei" && hebrewDate.get("Day") == 14) ||
    (hebrewDate.get("Month") == "Tishrei" && hebrewDate.get("Day") == 21) ||
    (hebrewDate.get("Month") == "Nisan" && hebrewDate.get("Day") == 14) ||
    (hebrewDate.get("Month") == "Nisan" && hebrewDate.get("Day") == 20) ||
    (hebrewDate.get("Month") == "Sivan" && hebrewDate.get("Day") == 5)) {
      //if the day after Yom Tov is Shabbos, send three days after yom tov (Shavuos can't fall out on Thursday)
      if (today.getDay() == 3) {
        if (formatDay(addDays(today, 1)) == formatDay(data[i][0]) || (formatDay(addDays(today, 2)) == formatDay(data[i][0]))) {
      sendEmail(i, `Happy (early)`);
        }
        if (!createdOneTimeEvent) {createOneTimeEvent((today.getDay() + 3) % 7, 22); createdOneTimeEvent = true;}
        PropertiesService.getScriptProperties().setProperty("sentUntil", 3);
        } 
      else {
        if (formatDay(addDays(today, 1)) == formatDay(data[i][0])) {
            sendEmail(i, `Happy (early)`);
        }
        if (!createdOneTimeEvent) {createOneTimeEvent((today.getDay() + 2) % 7, 22); createdOneTimeEvent = true;}
        PropertiesService.getScriptProperties().setProperty("sentUntil", 2);    
      }
  }
}

if (formatDay(today) == formatDay(data[i][0])) {
      sendEmail(i, `Happy`);
}
}

//send at 10:00pm for Yom Kippur if Yom Kippur isn't Shabbos. YK cannot be on Friday, so no need to account for overflow (to say if today.getDay() == 6 then onWeekDay(days[0]))
if (hebrewDate.get("Month") == "Tishrei" && hebrewDate.get("Day") == 9 && today.getDay() != 5) {
  createOneTimeEvent((today.getDay() + 1), 22);
  PropertiesService.getScriptProperties().setProperty("sentUntil", 1);
  console.log("Created trigger for 10:00pm Yom Kipper night");
}

//Delete one-time trigger on day after use
if ((hebrewDate.get("Month") == "Tishrei" && hebrewDate.get("Day") == 3) ||
    (hebrewDate.get("Month") == "Tishrei" && hebrewDate.get("Day") == 11) ||
    (hebrewDate.get("Month") == "Tishrei" && hebrewDate.get("Day") == 17) ||
    (hebrewDate.get("Month") == "Tishrei" && hebrewDate.get("Day") == 24) ||
    (hebrewDate.get("Month") == "Nisan" && hebrewDate.get("Day") == 17) ||
    (hebrewDate.get("Month") == "Nisan" && hebrewDate.get("Day") == 23) ||
    (hebrewDate.get("Month") == "Sivan" && hebrewDate.get("Day") == 8)) {
    recreateTriggers();
}

if (!isBirthdayToday) {console.log("No birthdays to send")};
}

function getHebrewDate(d) {
const year = d.getFullYear();
const month = addLeadingZeroIfLenIsOne(d.getMonth() + 1);
const day = addLeadingZeroIfLenIsOne(d.getDate());
const hebcal = UrlFetchApp.fetch(`https://www.hebcal.com/converter?cfg=json&gy=${year}&gm=${month}&gd=${day}&g2h=1`).getContentText();
const hebrewYear = hebcal.substring(hebcal.indexOf(`"hy":`) + 5, hebcal.indexOf(`,"hm"`));
const hebrewMonth = hebcal.substring(hebcal.indexOf(`"hm":"`) + 6, hebcal.indexOf(`","hd"`));
const hewbrewDay = hebcal.substring(hebcal.indexOf(`","hd":`) + 7, hebcal.indexOf(`,"hebrew":"`));
const hebrewDate = new Map();
hebrewDate.set("Year", hebrewYear);
hebrewDate.set("Month", hebrewMonth);
hebrewDate.set("Day", hewbrewDay);
return hebrewDate;  
}

function formatDay(d) {
const month = addLeadingZeroIfLenIsOne(d.getMonth() + 1);
const day = addLeadingZeroIfLenIsOne(d.getDate());
return `${month}/${day}`;
}

function getEventType(notes) {
  if (notes == "Anniversary") {return "Anniversary";}
  else {return "Birthday";}
}

function recreateTriggers() {
  //deletes all triggers
  var triggers = ScriptApp.getProjectTriggers();
 for (var i = 0; i < triggers.length; i++) {
   ScriptApp.deleteTrigger(triggers[i]);
 }
  console.log("Deleted all triggers");
 //creates triggers
  for (let day = 0; day < 6; day++) {
  createOneTimeEvent(day, 8);}
  createOneTimeEvent(6, 22);
  console.log("Created triggers");
}

function createOneTimeEvent(day, time) {
  const days = [ScriptApp.WeekDay.SUNDAY, ScriptApp.WeekDay.MONDAY, ScriptApp.WeekDay.TUESDAY, ScriptApp.WeekDay.WEDNESDAY, ScriptApp.WeekDay.THURSDAY, ScriptApp.WeekDay.FRIDAY, ScriptApp.WeekDay.SATURDAY];
  console.log(`Created new trigger on ${days[day]} at ${time}`);
  ScriptApp.newTrigger('main').timeBased().onWeekDay(days[day]).atHour(time).create();
}

function sendEmail(i, begStr) {
var msg = `${begStr} ${getEventType(data[i][4])} ${data[i][2]}!
Love Ari & Rosa`;
     GmailApp.sendEmail(data[i][1], "", msg, {
          from: "aribennett1@gmail.com"
        });
    console.log(`email: ${data[i][1]}, msg: ${msg}`);    
  console.log(MailApp.getRemainingDailyQuota());
  isBirthdayToday = true;
}

function addDays(date, days) {
var result = new Date(date);
result.setDate(result.getDate() + days);
return result;
}

function addLeadingZeroIfLenIsOne(num) {
if (num.toString().length == 1) {
    num = "0" + num;
  }
  return num;
}
