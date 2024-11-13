const OPENAI_API_KEY = ''; // here goes your Open AI api key
const DAYS_TO_CHECK = 5;  // Number of days to look back in emails
const MODEL='gpt-3.5-turbo'; // Change whatever model you want to use

function analyzeEmailsWithAI() {
  // Get only unread emails from the last specified days, excluding Social, Promotions, and Forums categories
  const threads = GmailApp.search(`is:unread newer_than:${DAYS_TO_CHECK}d -category:social -category:promotions -category:forums`);
  
  // Check if there are no emails meeting the criteria
  if (threads.length === 0) {
    GmailApp.sendEmail(Session.getActiveUser().getEmail(), 'Email Summary - No Actions Needed', `No unread emails found from the last ${DAYS_TO_CHECK} day(s) that require action.`);
    return;  // Exit the function if no relevant emails are found
  }
  
  let summary = "<h2>Summary of Emails Requiring Action:</h2><br>";
  let emailData = [];  // Array to store each email's data to be sent to OpenAI in bulk
  
  // Gather email data for bulk OpenAI request
  threads.forEach(thread => {
    const messages = thread.getMessages();
    const threadLink = `https://mail.google.com/mail/u/0/#inbox/${thread.getId()}`;  // Link to the thread

    messages.forEach(message => {
      const from = message.getFrom();
      const date = message.getDate();
      const subject = message.getSubject();
      const toField = message.getTo();
      const ccField = message.getCc();
      const body = message.getPlainBody();
      
      // Validate data to ensure body, from, and other properties are defined
      if (body && from && date && subject) {
        // Check if you're in the "To" or "Cc" field
        const isTo = toField.includes(Session.getActiveUser().getEmail());
        const isCc = ccField.includes(Session.getActiveUser().getEmail());
        
        // Add the email data to the array for bulk OpenAI analysis
        emailData.push({
          from,
          date,
          subject,
          body,
          isTo,
          isCc,
          threadLink  // Include thread link for summary
        });
      }
    });
  });
  
  // If no valid emails are found after filtering, send notification and exit
  if (emailData.length === 0) {
    GmailApp.sendEmail(Session.getActiveUser().getEmail(), 'Email Summary - No Valid Emails', `No valid unread emails found from the last ${DAYS_TO_CHECK} day(s) that require action.`);
    return;
  }
  
  // Call OpenAI in bulk with the gathered email data
  const aiResponses = callOpenAIModelBulk(emailData);
  
  // Process the responses from OpenAI and build the summary
  aiResponses.forEach((response, index) => {
    const email = emailData[index];
    const emailSummary = response.summary || email.body.slice(0, 100) + "...";
    const priority = response.priority || (email.isTo ? 'Immediate Attention' : 'Important');
    
    // Determine action required based on email status and priority
    const actionRequired = (priority === 'Immediate Attention') ? 'Requires immediate attention' : 'Review if time permits';
    
    // Add summary and action based on priority and role (To/Cc), with a link to the email thread
    summary += `<p><strong>${priority}:</strong><br>
      - <strong>From:</strong> ${email.from}<br>
      - <strong>Date:</strong> ${email.date}<br>
      - <strong>Subject:</strong> ${email.subject}<br>
      - <a href="${email.threadLink}" target="_blank">Open Email</a><br>
      - <strong>Summary:</strong> ${emailSummary}<br>
      - <strong>Action:</strong> ${actionRequired}</p><br>`;
  });
  
  // Send the summarized email with HTML format
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), 'Email Summary - Important & Immediate Actions', '', {htmlBody: summary});
}

function callOpenAIModelBulk(emailData) {
  try {
    const messages = emailData.map(email => ({
      role: "user",
      content: `Email Body:\n${email.body}\n\nIs the user in the To field: ${email.isTo}\nIs the user in the CC field: ${email.isCc}\n\nPlease provide a priority level ("Immediate Attention" or "Important") and a 1-2 sentence summary.`
    }));

    const payload = {
      model: MODEL,  // Specify the model you want to use
      messages: [
        { role: "system", content: "Analyze each email's priority based on the user's position (To/CC) and provide a brief summary for each." },
        ...messages
      ]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", options);
    const responseData = JSON.parse(response.getContentText());

    // Process the responses and return structured data
    return responseData.choices.map(choice => {
      const content = choice.message.content;
      const [priority, summary] = content.split("\n").map(line => line.split(":")[1]?.trim());
      return { priority, summary };
    });
  } catch (e) {
    Logger.log("Error calling OpenAI API: " + e.toString());
    return emailData.map(() => ({ priority: 'Important', summary: null }));  // Fallback priority and empty summary
  }
}
