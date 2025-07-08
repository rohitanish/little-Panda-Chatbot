function doGet(e) {
  try {
    var userInput = e.parameter.question || '';
    var feedback = e.parameter.feedback || ''; // 'success' or 'failure'
    var answerRowIndex = e.parameter.answerRow || ''; // Row index of the answer being rated
    
    // Handle feedback submission
    if (feedback && answerRowIndex) {
      recordFeedback(answerRowIndex, feedback, userInput);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: "Thank you for your feedback!"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle regular question
    if (!userInput.trim()) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Please provide a question"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = findAnswer(userInput.toLowerCase());
    
    // Ensure result is properly structured
    if (typeof result === 'string') {
      result = {
        answer: result,
        rowIndex: -1
      };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        answer: result.answer,
        input: userInput,
        answerRowIndex: result.rowIndex,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: "Error: " + error.toString(),
        debug: {
          userInput: e.parameter.question || 'undefined',
          feedback: e.parameter.feedback || 'undefined',
          answerRow: e.parameter.answerRow || 'undefined'
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function findAnswer(userInput) {
  // Clean and tokenize user input
  var cleanInput = userInput.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
  
  // Check for greetings and conversational responses first
  var conversationalResponse = handleConversationalInput(cleanInput);
  if (conversationalResponse) {
    logQuestionAnswer(userInput, conversationalResponse, 0);
    return {
      answer: conversationalResponse,
      rowIndex: 0
    };
  }
  
  // Replace with your actual Google Sheet ID
  var sheet = SpreadsheetApp.openById('1tzytt4G2U6dYG42qM01y4WucFhlJeNwRDLXHjFugMeQ').getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  var userWords = cleanInput.split(' ');
  var bestMatch = null;
  var highestScore = 0;
  var bestRowIndex = -1;
  
  // Enhanced question patterns for better matching
  var questionPatterns = extractQuestionPatterns(cleanInput);
  
  // Skip header row, start from row 1
  for (var i = 1; i < data.length; i++) {
    var keywords = data[i][0].split(',');
    var category = data[i][2] || '';
    var score = 0;
    
    // Method 1: Enhanced keyword matching
    score += matchKeywords(keywords, userWords, cleanInput);
    
    // Method 2: Question pattern matching
    score += matchQuestionPatterns(questionPatterns, keywords, category);
    
    // Method 3: Semantic similarity for common educational terms
    score += matchSemanticSimilarity(cleanInput, keywords);
    
    // Method 4: Category-based matching
    score += matchCategoryContext(cleanInput, category);
    
    // Update best match if this row has a higher score
    if (score > highestScore && score >= 15) { // Increased threshold
      highestScore = score;
      bestMatch = data[i][1];
      bestRowIndex = i + 1;
    }
  }
  
  // Return best match or default message
  if (bestMatch) {
    logQuestionAnswer(userInput, bestMatch, bestRowIndex);
    return {
      answer: bestMatch,
      rowIndex: bestRowIndex
    };
  }
  
  // Log failed queries
  logQuestionAnswer(userInput, "No answer found", -1);
  
  return {
    answer: "I couldn't find an answer to your question. You can ask me about: Fees, Admission, Curriculum, Emergency Procedures, Contact Information, School Timings, Transport Services, and more.\n\nFor further assistance, please <a href='https://api.whatsapp.com/send/?phone=918600600033&text&type=phone_number&app_absent=0' target='_blank'>contact us on WhatsApp</a> 📱",
    rowIndex: -1
  };
}

// Enhanced keyword matching function
function matchKeywords(keywords, userWords, cleanInput) {
  var score = 0;
  var matchedKeywords = 0;
  
  for (var i = 0; i < keywords.length; i++) {
    var keyword = keywords[i].trim().toLowerCase();
    var keywordScore = 0;
    
    // Direct substring match (highest priority)
    if (cleanInput.includes(keyword)) {
      keywordScore = 20;
      matchedKeywords++;
    }
    
    // Handle compound keywords (e.g., "enrollment_process")
    if (keyword.includes('_')) {
      var parts = keyword.split('_');
      var partMatches = 0;
      
      for (var j = 0; j < parts.length; j++) {
        if (cleanInput.includes(parts[j])) {
          partMatches++;
        }
      }
      
      if (partMatches === parts.length) {
        keywordScore = Math.max(keywordScore, 25); // Full compound match
      } else if (partMatches > 0) {
        keywordScore = Math.max(keywordScore, 10 + (partMatches * 5)); // Partial match
      }
    }
    
    // Individual word matching
    for (var k = 0; k < userWords.length; k++) {
      var userWord = userWords[k];
      
      if (userWord === keyword) {
        keywordScore = Math.max(keywordScore, 15);
      } else if (userWord.includes(keyword) || keyword.includes(userWord)) {
        if (Math.abs(userWord.length - keyword.length) <= 2) {
          keywordScore = Math.max(keywordScore, 12);
        }
      } else if (calculateSimilarity(userWord, keyword) > 0.7) {
        keywordScore = Math.max(keywordScore, 10);
      } else if (isCommonSpellingVariation(userWord, keyword)) {
        keywordScore = Math.max(keywordScore, 12);
      }
    }
    
    score += keywordScore;
  }
  
  // Bonus for matching multiple keywords
  if (matchedKeywords > 1) {
    score += matchedKeywords * 5;
  }
  
  return score;
}

// Extract question patterns from user input
function extractQuestionPatterns(input) {
  var patterns = {
    howTo: /how\s+(to|do|can)\s+(\w+)/g,
    whatIs: /what\s+(is|are)\s+(\w+)/g,
    whenIs: /when\s+(is|are|do)\s+(\w+)/g,
    whereIs: /where\s+(is|are|can)\s+(\w+)/g,
    enrollment: /enroll|admission|join|apply|register|admit/g,
    fees: /fee|cost|price|payment|charge|money/g,
    timing: /time|timing|schedule|hour|when/g,
    curriculum: /curriculum|teach|method|learn|study|education/g,
    contact: /contact|phone|email|reach|talk|speak/g,
    transport: /transport|van|bus|pickup|drop/g
  };
  
  var matches = {};
  
  for (var pattern in patterns) {
    var match = input.match(patterns[pattern]);
    if (match) {
      matches[pattern] = match;
    }
  }
  
  return matches;
}

// Match question patterns with keywords
function matchQuestionPatterns(patterns, keywords, category) {
  var score = 0;
  
  // Enrollment/Admission patterns
  if (patterns.enrollment || patterns.howTo) {
    if (keywords.some(function(k) { return k.includes('enrollment') || k.includes('admission') || k.includes('enroll'); })) {
      score += 30;
    }
  }
  
  // Fee/Payment patterns
  if (patterns.fees) {
    if (keywords.some(function(k) { return k.includes('fee') || k.includes('payment') || k.includes('cost'); })) {
      score += 25;
    }
  }
  
  // Curriculum/Teaching patterns
  if (patterns.curriculum) {
    if (keywords.some(function(k) { return k.includes('curriculum') || k.includes('teach') || k.includes('method'); })) {
      score += 25;
    }
  }
  
  // Timing patterns
  if (patterns.timing || patterns.whenIs) {
    if (keywords.some(function(k) { return k.includes('timing') || k.includes('schedule') || k.includes('hour'); })) {
      score += 25;
    }
  }
  
  // Contact patterns
  if (patterns.contact) {
    if (keywords.some(function(k) { return k.includes('contact') || k.includes('phone') || k.includes('email'); })) {
      score += 25;
    }
  }
  
  // Transport patterns
  if (patterns.transport) {
    if (keywords.some(function(k) { return k.includes('transport') || k.includes('van') || k.includes('pickup'); })) {
      score += 25;
    }
  }
  
  return score;
}

// Enhanced semantic similarity matching
function matchSemanticSimilarity(input, keywords) {
  var score = 0;
  
  // Common educational synonyms
  var synonyms = {
    'enroll': ['join', 'register', 'admit', 'apply', 'admission'],
    'fee': ['cost', 'price', 'charges', 'payment', 'money'],
    'curriculum': ['syllabus', 'course', 'program', 'education', 'learning'],
    'timing': ['schedule', 'time', 'hours', 'duration'],
    'teacher': ['staff', 'faculty', 'instructor', 'educator'],
    'transport': ['van', 'bus', 'pickup', 'drop', 'vehicle'],
    'contact': ['phone', 'call', 'email', 'reach', 'connect'],
    'assessment': ['exam', 'test', 'evaluation', 'progress']
  };
  
  for (var i = 0; i < keywords.length; i++) {
    var keyword = keywords[i].trim().toLowerCase();
    
    // Check if any synonym appears in input
    if (synonyms[keyword]) {
      for (var j = 0; j < synonyms[keyword].length; j++) {
        if (input.includes(synonyms[keyword][j])) {
          score += 20;
          break;
        }
      }
    }
    
    // Reverse check - if input contains a word that's a synonym of keyword
    for (var word in synonyms) {
      if (synonyms[word].includes(keyword) && input.includes(word)) {
        score += 20;
        break;
      }
    }
  }
  
  return score;
}

// Category-based context matching
function matchCategoryContext(input, category) {
  var score = 0;
  
  var categoryKeywords = {
    'communication': ['update', 'information', 'notify', 'message', 'whatsapp'],
    'curriculum': ['learn', 'teach', 'education', 'study', 'method'],
    'assessment': ['test', 'exam', 'evaluation', 'progress', 'grade'],
    'emergency': ['emergency', 'accident', 'first aid', 'medical'],
    'contact': ['phone', 'email', 'reach', 'talk', 'speak'],
    'transport': ['pickup', 'drop', 'van', 'bus', 'vehicle'],
    'fees': ['payment', 'cost', 'money', 'charges'],
    'admission': ['enroll', 'join', 'register', 'apply']
  };
  
  if (categoryKeywords[category]) {
    for (var i = 0; i < categoryKeywords[category].length; i++) {
      if (input.includes(categoryKeywords[category][i])) {
        score += 10;
      }
    }
  }
  
  return score;
}

// Handle conversational inputs (greetings, responses, etc.)
function handleConversationalInput(cleanInput) {
  var greetings = {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hii', 'helo', 'hllo'],
    responses: [
      "Hello! Welcome to Little Panda Preschool! 🐼 How can I help you today?",
      "Hi there! I'm here to help you with any questions about Little Panda Preschool. What would you like to know?",
      "Hello! Great to see you here! Feel free to ask me about our fees, curriculum, timings, or any other queries.",
      "Hi! Welcome! I can help you with information about admissions, facilities, programs, and more. What interests you?"
    ]
  };
  
  var howAreYou = {
    keywords: ['how are you', 'how r u', 'how do you do', 'whats up', 'what\'s up', 'how are things'],
    responses: [
      "I'm doing great, thank you for asking! 😊 I'm here and ready to help you with any questions about Little Panda Preschool!",
      "I'm wonderful! Always excited to help parents and students learn more about our school. How can I assist you today?",
      "I'm doing fantastic! Thanks for asking. I'm here to provide you with all the information you need about Little Panda Preschool."
    ]
  };
  
  var positiveResponses = {
    keywords: ['okay', 'ok', 'fine', 'good', 'great', 'nice', 'thanks', 'thank you', 'alright', 'sure', 'yes', 'yeah', 'perfect', 'awesome', 'cool'],
    responses: [
      "Great! Is there anything else you'd like to know about Little Panda Preschool?",
      "Wonderful! Feel free to ask me about our programs, fees, timings, or any other questions you might have.",
      "Perfect! I'm here if you need any more information about admissions, curriculum, facilities, or anything else.",
      "Excellent! Don't hesitate to ask if you have more questions about our school."
    ]
  };
  
  var gratitude = {
    keywords: ['thank you', 'thanks', 'thanku', 'thank u', 'appreciate', 'grateful'],
    responses: [
      "You're very welcome! Happy to help! 😊 If you need any more information, just ask!",
      "My pleasure! I'm always here to help with your questions about Little Panda Preschool.",
      "You're welcome! Feel free to reach out anytime you need information about our school."
    ]
  };
  
  var goodbye = {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'gtg', 'got to go', 'talk later'],
    responses: [
      "Goodbye! Hope to see you at Little Panda Preschool soon! 🐼✨",
      "See you later! Don't forget, you can always come back if you have more questions!",
      "Bye! Wishing you a wonderful day! Feel free to contact us anytime."
    ]
  };
  
  var help = {
    keywords: ['help', 'support', 'assist', 'guide', 'info', 'information'],
    responses: [
      "I'd be happy to help! You can ask me about:\n• Fee structure and payment options\n• Admission process and requirements\n• Daily routines and timings\n• Curriculum and teaching methods\n• Transport services\n• Safety and emergency procedures\n• Events and activities\n• Contact information\n\nWhat would you like to know?",
      "Sure! I can provide information about all aspects of Little Panda Preschool. Just ask me about fees, admissions, programs, facilities, or anything else you're curious about!"
    ]
  };
  
  var categories = [greetings, howAreYou, positiveResponses, gratitude, goodbye, help];
  
  // Only trigger conversational responses for short, simple inputs
  if (cleanInput.split(' ').length <= 3) {
    for (var i = 0; i < categories.length; i++) {
      var category = categories[i];
      for (var j = 0; j < category.keywords.length; j++) {
        var keyword = category.keywords[j];
        if (cleanInput === keyword || cleanInput.includes(keyword)) {
          var randomIndex = Math.floor(Math.random() * category.responses.length);
          return category.responses[randomIndex];
        }
      }
    }
  }
  
  return null; // No conversational match found
}

// Rest of the helper functions remain the same...
function recordFeedback(rowIndex, feedback, originalQuestion) {
  try {
    var spreadsheet = SpreadsheetApp.openById('1tzytt4G2U6dYG42qM01y4WucFhlJeNwRDLXHjFugMeQ');
    var mainSheet = spreadsheet.getActiveSheet();
    
    if (mainSheet.getRange('C1').getValue() === '') {
      mainSheet.getRange('C1').setValue('Success Count');
      mainSheet.getRange('D1').setValue('Failure Count');
      mainSheet.getRange('E1').setValue('Last Updated');
    }
    
    if (rowIndex > 0) {
      var currentSuccessCount = mainSheet.getRange('C' + rowIndex).getValue() || 0;
      var currentFailureCount = mainSheet.getRange('D' + rowIndex).getValue() || 0;
      
      if (feedback === 'success') {
        mainSheet.getRange('C' + rowIndex).setValue(currentSuccessCount + 1);
      } else if (feedback === 'failure') {
        mainSheet.getRange('D' + rowIndex).setValue(currentFailureCount + 1);
      }
      
      mainSheet.getRange('E' + rowIndex).setValue(new Date());
    }
    
    logToAnalyticsSheet(spreadsheet, originalQuestion, feedback, rowIndex);
    
  } catch (error) {
    console.error('Error recording feedback:', error);
  }
}

function logQuestionAnswer(question, answer, rowIndex) {
  try {
    var spreadsheet = SpreadsheetApp.openById('1tzytt4G2U6dYG42qM01y4WucFhlJeNwRDLXHjFugMeQ');
    var analyticsSheet = getOrCreateAnalyticsSheet(spreadsheet);
    
    var answerText = typeof answer === 'string' ? answer : answer.answer || answer;
    
    analyticsSheet.appendRow([
      new Date(),
      question,
      answerText.substring(0, 100) + (answerText.length > 100 ? '...' : ''),
      rowIndex,
      '',
      ''
    ]);
    
  } catch (error) {
    console.error('Error logging question:', error);
  }
}

function logToAnalyticsSheet(spreadsheet, question, feedback, rowIndex) {
  try {
    var analyticsSheet = getOrCreateAnalyticsSheet(spreadsheet);
    var data = analyticsSheet.getDataRange().getValues();
    
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][1] === question && data[i][4] === '') {
        analyticsSheet.getRange('E' + (i + 1)).setValue(feedback);
        break;
      }
    }
    
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
}

function getOrCreateAnalyticsSheet(spreadsheet) {
  var analyticsSheet = spreadsheet.getSheetByName('Analytics');
  
  if (!analyticsSheet) {
    analyticsSheet = spreadsheet.insertSheet('Analytics');
    
    analyticsSheet.getRange('A1:F1').setValues([[
      'Timestamp', 'Question', 'Answer', 'Row Index', 'Feedback', 'Notes'
    ]]);
    
    analyticsSheet.getRange('A1:F1').setFontWeight('bold');
    analyticsSheet.getRange('A1:F1').setBackground('#f0f0f0');
    
    analyticsSheet.setColumnWidth(1, 150);
    analyticsSheet.setColumnWidth(2, 300);
    analyticsSheet.setColumnWidth(3, 300);
    analyticsSheet.setColumnWidth(4, 100);
    analyticsSheet.setColumnWidth(5, 100);
    analyticsSheet.setColumnWidth(6, 200);
  }
  
  return analyticsSheet;
}

function isCommonSpellingVariation(userWord, keyword) {
  var variations = {
    'curiculum': 'curriculum',
    'curriculam': 'curriculum',
    'curriclum': 'curriculum',
    'ciriculum': 'curriculum',
    'curicculum': 'curriculum',
    'fess': 'fees',
    'feess': 'fees',
    'phees': 'fees',
    'trasport': 'transport',
    'transporte': 'transport',
    'transprot': 'transport',
    'timming': 'timing',
    'timeing': 'timing',
    'timmings': 'timings',
    'assesment': 'assessment',
    'assesments': 'assessment',
    'asessment': 'assessment',
    'comunication': 'communication',
    'comunciation': 'communication',
    'communicaton': 'communication',
    'admision': 'admission',
    'admissions': 'admission',
    'admissoin': 'admission',
    'payement': 'payment',
    'pymnt': 'payment',
    'payemnt': 'payment',
    'shedule': 'schedule',
    'schedual': 'schedule',
    'scedule': 'schedule',
    'facilty': 'facility',
    'facilites': 'facilities',
    'faciltiy': 'facility',
    'emergancy': 'emergency',
    'emrgency': 'emergency',
    'emergencies': 'emergency',
    'enrol': 'enroll',
    'enrollment': 'enroll',
    'enrollement': 'enroll'
  };
  
  if (variations[userWord] && variations[userWord] === keyword) {
    return true;
  }
  
  for (var mistake in variations) {
    if (variations[mistake] === userWord && mistake === keyword) {
      return true;
    }
  }
  
  return false;
}

function calculateSimilarity(str1, str2) {
  if (str1.length === 0 || str2.length === 0) return 0;
  
  var longer = str1.length > str2.length ? str1 : str2;
  var shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  var editDistance = calculateEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function calculateEditDistance(str1, str2) {
  var matrix = [];
  
  for (var i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (var j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (var i = 1; i <= str2.length; i++) {
    for (var j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}