Here’s the script with extra comments removed for cleaner readability:

function checkDailyStatusEmailsByLabel() {
  var expectedSenders = [
    'EngineerNames....'
  ];
  
  var timeZone = 'Asia/Kolkata';
  var today = new Date();
  var startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 0, 0); 
  var endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 50, 0); 
  
  var label = GmailApp.getUserLabelByName('Daily Status Update');
  
  if (!label) {
    MailApp.sendEmail(Session.getActiveUser().getEmail(), 'Label Not Found', 'The label "Daily Status Update" was not found.');
    return;
  }
  
  var threads = label.getThreads(0, 20);  
  var emails = GmailApp.getMessagesForThreads(threads);
  var sendersWhoSent = [];

  emails.forEach(function(emailList) {
    emailList.forEach(function(email) {
      var subject = email.getSubject();
      var emailDate = new Date(email.getDate());
      if (subject && emailDate >= startTime && emailDate <= endTime) {  
        var senderEmail = email.getFrom().match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
        if (senderEmail && !sendersWhoSent.includes(senderEmail[0])) {
          sendersWhoSent.push(senderEmail[0]);
        }
      }
    });
  });
  
  var status = expectedSenders.map(function(sender) {
    return sendersWhoSent.includes(sender) ? 'Received' : 'Missing';
  });
  
  writeStatusToGoogleSheetWithColor(status);
  
  var missingSenders = expectedSenders.filter(function(sender, index) {
    return status[index] === 'Missing';
  });
  
  if (missingSenders.length > 0) {
    var bccRecipients = missingSenders.join(',');
    MailApp.sendEmail({
      to: '',
      bcc: bccRecipients,
      subject: 'Reminder: Missing Daily Status Update',
      body: 'Dear Team Member,\n\nThis is a reminder that I have not received your status update for today. Please make sure to send it before 11:30 PM IST. Also do not forget to use "Daily Status Update" in the Subject line while sending. \n\nThank you\n Navdeep Singh\n Delivery Manager\n Futuralis LLC.'
    });
    
    MailApp.sendEmail({
      to: 'navdeep@futuralis.com',
      subject: 'Missing Daily Status Updates - List of Members',
      body: 'Hi Navdeep,\n\nThe following team members have not sent their status update for today:\n\n' + missingSenders.join('\n') + '\n\nPlease take necessary actions.\n\nThanks.'
    });
    
  } else {
    MailApp.sendEmail(Session.getActiveUser().getEmail(), 'All Status Emails Received', 'All expected senders have sent their status emails today.');
  }
}

function getFormattedDateTime(date) {
  return Utilities.formatDate(date, 'Asia/Kolkata', 'yyyy/MM/dd HH:mm:ss');
}

function writeStatusToGoogleSheetWithColor(status) {
  var sheet = SpreadsheetApp.openById('SHEET_ID').getSheetByName('Daily Status Missing'); 
  var firstRow = ['Date', 'EngineerNames....'];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(firstRow);
  }
  
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy/MM/dd');
  var newRow = [today].concat(status);
  var row = sheet.appendRow(newRow);
  var lastRow = sheet.getLastRow();
  var range = sheet.getRange(lastRow, 2, 1, status.length); 
  
  var backgrounds = status.map(function(value) {
    return value === 'Received' ? '#00FF00' : '#FF0000'; 
  });
  
  range.setBackgrounds([backgrounds]); 
}

This streamlined version should help with readability and ease of understanding. Let me know if you need any further adjustments!
