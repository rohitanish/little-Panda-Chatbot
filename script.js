 class PandaBot {

            

            hideInput() {
    const chatInput = document.querySelector('.chat-input');
    
    // Add closing animation
    chatInput.classList.add('closing');
    chatInput.classList.remove('visible');
    
    // After animation completes, add hidden class and remove closing
    setTimeout(() => {
        chatInput.classList.add('hidden');
        chatInput.classList.remove('closing');
    }, 400);
}

showInput(placeholder = "Type your message...") {
    const chatInput = document.querySelector('.chat-input');
    
    // Set placeholder if provided
    if (placeholder) {
        this.messageInput.placeholder = placeholder;
    }
    
    // Remove hidden class and add opening animation
    chatInput.classList.remove('hidden');
    chatInput.classList.add('opening');
    
    // After animation starts, add visible class and remove opening
    setTimeout(() => {
        chatInput.classList.add('visible');
        chatInput.classList.remove('opening');
        this.messageInput.focus();
    }, 100);
}

            // Add these methods inside your PandaBot class
showPopup(message = "Hello! 👋", duration = 3000) {
    const popup = document.getElementById('popupMessage');
    popup.textContent = message;
    popup.classList.add('show');
    
    // Auto-hide after duration
    setTimeout(() => {
        this.hidePopup();
    }, duration);
}

hidePopup() {
    const popup = document.getElementById('popupMessage');
    popup.classList.remove('show');
}

addMissionImage(imageUrl, altText = 'Mission Image') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🐼';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = altText;
    img.className = 'mission-image'; // Use the new CSS class
    img.onerror = function() { this.style.display = 'none'; };
    
    // No click event listener for mission image
    
    messageContent.appendChild(img);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
}

            // Add this method inside your PandaBot class
                setupImageModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('imageModal')) {
        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <span class="modal-close">&times;</span>
            <img class="modal-content" id="modalImage">
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.modal-close');
       closeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    this.closeImageModal();
});
        
       // Close modal when clicking outside the image
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        e.stopPropagation(); // Prevent event bubbling
        this.closeImageModal();
    }
});
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeImageModal();
            }
        });
    }
}

openImageModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.classList.add('active');
    modalImg.src = imageUrl;
    document.body.style.overflow = 'hidden';
}

closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}
            constructor() {
                this.chatButton = document.getElementById('chatButton');
                this.chatWindow = document.getElementById('chatWindow');
                this.closeBtn = document.getElementById('closeBtn');
                this.messageInput = document.getElementById('messageInput');
                this.sendBtn = document.getElementById('sendBtn');
                this.chatMessages = document.getElementById('chatMessages');
                this.typingIndicator = document.getElementById('typingIndicator');
                this.apiStatus = document.getElementById('apiStatus');
                
                this.isOpen = false;
                this.currentStep = 'welcome'; // // welcome -> name -> phone -> main_menu -> faq_input
                this.userName = '';
                this.userPhone = '';
                this.messageQueue = [];
                this.isProcessing = false;
                this.setCurrentYear();
                this.popupMessage = document.getElementById('popupMessage');
                setTimeout(() => {
        this.hideInput();
    }, 100);
    
    // Show popup after page loads
    setTimeout(() => {
        this.showPopup("Hello! Need help? 🐼", 4000);
    }, 2000);
                
                // Google Sheets API URL - REPLACE WITH YOUR ACTUAL GOOGLE SHEETS API URL
                this.googleSheetsURL = 'https://script.google.com/macros/s/AKfycbxd5WNZjj-mKcUUV6sWTyNY-Hi6YFcMMxl0cW2Q0XVCoIDv8ObmcU92DWcOHvmlAy_tvg/exec';
                this.faqURL = 'https://script.google.com/macros/s/AKfycbxEo8Fijdh-nRybJfJcp9VODrQ0wxiP8tvL2wqlBnmlEouWgsQEtPXKktuyfR24ckpjeQ/exec';
                this.userFAQQuestion = '';
                
                this.init();
                this.setupImageModal(); 
            }
            setCurrentYear() {
    const currentYear = new Date().getFullYear();
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = currentYear;
    }
}

            init() {
                this.chatButton.addEventListener('click', () => this.toggleChat());
                this.closeBtn.addEventListener('click', () => this.closeChat());
                this.sendBtn.addEventListener('click', () => this.sendMessage());
                this.messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.sendMessage();
                    }
                });
                this.messageInput.addEventListener('input', () => this.updateSendButton());
                
                // Handle button clicks
                this.chatMessages.addEventListener('click', (e) => {
                    if (e.target.classList.contains('chat-button-option')) {
                        this.handleButtonClick(e.target.dataset.action);
                    }
                });
                
                
                // Close chat when clicking outside
                // Close chat when clicking outside
document.addEventListener('click', (e) => {
    
    // Don't close chat if clicking on modal or modal elements
    const modal = document.getElementById('imageModal');
    const isModalClick = modal && (modal.contains(e.target) || e.target === modal);
    
    if (this.isOpen && 
        !this.chatWindow.contains(e.target) && 
        !this.chatButton.contains(e.target) && 
        !isModalClick) {
        this.closeChat();
    }
});
            }

            toggleChat() {
                this.hidePopup();
                if (this.isOpen) {
                    this.closeChat();
                } else {
                    this.openChat();
                }
            }

            openChat() {
                this.chatWindow.classList.add('active', 'opening');
                this.isOpen = true;
                this.messageInput.focus();
                
                // Show welcome message if first time
                if (this.currentStep === 'welcome') {
                    setTimeout(() => {
                        this.showWelcomeSequence();
                    }, 500);
                }
            }

            closeChat() {
                this.chatWindow.classList.remove('active', 'opening');
                this.isOpen = false;
            }
            addPandaDescription() {
    const description = document.createElement('div');
    description.className = 'panda-description';
    description.innerHTML = 'Meet Littlebot, your friendly guide to Little Panda Preschool, here to answer your questions and provide helpful information!';
    this.chatMessages.appendChild(description);
    this.scrollToBottom();
}

           async showWelcomeSequence() {
    // Show panda image first
    this.addPandaImage();
    await this.delay(800);

    this.addPandaDescription();
    await this.delay(800);
    
    // Then welcome message
    this.addMessage("Rooooar! I'm Littlebot🤖🐼 your friendly guide to Little Panda!", 'bot');
    await this.delay(800);
    
    // Ask for name
    this.addMessage("What’s your <strong>name</strong>, buddy? I’m excited to guide you!", 'bot');
    this.currentStep = 'name';
    this.showInput("Enter your name...");
}

updateSendButton() {
    const hasText = this.messageInput.value.trim().length > 0;
    this.sendBtn.disabled = !hasText;
}

async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || this.isProcessing) return;

    this.isProcessing = true;
    
    // Add user message
    this.addMessage(message, 'user');
    this.messageInput.value = '';
    this.updateSendButton();

    // Hide any existing buttons
    this.fadeOutButtons();

    // Show typing indicator
    this.showTyping();

    // Process message based on current step
    await this.processMessage(message);
    
    this.hideTyping();
    this.isProcessing = false;
}

async processMessage(message) {
    await this.delay(1200); // 1.2 second delay for natural conversation

    switch (this.currentStep) {
       case 'name':
    this.userName = message;
    await this.saveToGoogleSheets();
    this.currentStep = 'main_menu';
    //  
    await this.delay(800);
    this.hideInput();
    this.showMainMenu();
    break;
        
       
        
        case 'main_menu':
            // Handle general conversation in main menu
            this.handleGeneralMessage(message);
            break;
        
        case 'faq_input':
            this.userFAQQuestion = message;
            await this.handleFAQResponse(message);
            this.currentStep='faq_input' 
            break;
    }
}

async addMessageWithDelay(content, sender, buttons = null) {
    this.addMessage(content, sender, buttons);
    if (buttons) {
        await this.delay(500); // Small delay before showing buttons
    }
}

async saveToGoogleSheets() {
    try {
        console.log('Attempting to save:', this.userName);
        
        const formData = new FormData();
        formData.append('name', this.userName);
        
        // Add debug logging
        console.log('FormData created with name:', this.userName);
        
        const response = await fetch(this.googleSheetsURL, {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
            const result = await response.text();
            console.log('Response text:', result);
        }
        
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
    }
}

async showMainMenu(isReturning = false) {
    if (!isReturning) {
        await this.addMessageWithDelay(`Hello ${this.userName}! I'm here to help you learn about Little Panda. 🐼`, 'bot');
        await this.delay(800);
    }
    
    const buttons = [
        { text: "About Us", action: "about-us", type: "primary" },
        { text: "Ask me!", action: "faq", type: "primary" },
        { text: "Programs & Curriculum", action: "programs", type: "primary" },
        { text: "Admission Enquiry", action: "admission", type: "primary" },
        { text: "Contact Us", action: "contact", type: "primary" },
        
    ];

    await this.addMessageWithDelay("What would you like to know about?", 'bot', buttons);
}

//email checker
isValidEmail(email) {
    // Comprehensive email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Additional checks
    const trimmedEmail = email.trim();
    
    // Basic format check
    if (!emailRegex.test(trimmedEmail)) {
        return false;
    }
    
    // Check for consecutive dots
    if (trimmedEmail.includes('..')) {
        return false;
    }
    
    // Check if starts or ends with dot
    if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
        return false;
    }
    
    // Check for valid length
    if (trimmedEmail.length < 5 || trimmedEmail.length > 254) {
        return false;
    }
    
    // Split and validate local and domain parts
    const [localPart, domainPart] = trimmedEmail.split('@');
    
    // Check local part length (before @)
    if (localPart.length < 1 || localPart.length > 64) {
        return false;
    }
    
    // Check domain part length (after @)
    if (domainPart.length < 1 || domainPart.length > 253) {
        return false;
    }
    
    // Check if domain has at least one dot
    if (!domainPart.includes('.')) {
        return false;
    }
    
    // Check for valid characters in local part
    const localPartRegex = /^[a-zA-Z0-9._%+-]+$/;
    if (!localPartRegex.test(localPart)) {
        return false;
    }
    
    // Check for valid characters in domain part
    const domainPartRegex = /^[a-zA-Z0-9.-]+$/;
    if (!domainPartRegex.test(domainPart)) {
        return false;
    }
    
    return true;
}

            fadeOutButtons() {
                const existingButtons = this.chatMessages.querySelectorAll('.message-buttons');
                existingButtons.forEach(buttonContainer => {
                    buttonContainer.classList.add('fade-out');
                    setTimeout(() => {
                        buttonContainer.remove();
                    }, 200);
                });
            }

            async handleButtonClick(action) {
                this.fadeOutButtons();
                // Show what the user clicked
                this.addMessage(action.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), 'user');
                // Show typing indicator
                this.showTyping();
                await this.delay(800);
                this.hideTyping();

                switch (action) {
                    case 'about-us':
                        // await this.addMessageWithDelay(`Great choice, ${this.userName}! 🌟`, 'bot');
                        // await this.delay(800);
                        await this.addMessageWithDelay("So, you want to know about Little Panda?", 'bot');
                        await this.delay(800);
                        
                        const aboutButtons = [
                            { text: "Our Mission", action: "mission" },
                            { text: "Meet Our Team", action: "Team" },
                            { text: "Our Testimonials", action: "Testimonials" },
                            { text: "Back to Menu", action: "main-menu", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("What would you specifically love to know!", 'bot', aboutButtons);
                        break;
                    
                    case 'programs':
                        await this.addMessageWithDelay(`Let me tell you about our programs, ${this.userName}! 📚`, 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("We offer comprehensive programs designed for different age groups.", 'bot');
                        await this.delay(800);
                        
                        const programButtons = [
                            { text: "Daycare (6 months-2.5 years)", action: "toddler-program" },
                            { text: "Preschool (1-6 years)", action: "preschool-program" },
                            { text: "Back to Menu", action: "main-menu", type: "secondary" }
                          
                        ];
                        await this.addMessageWithDelay("Each program combines academics with creative activities and social development.", 'bot', programButtons);
                        break;
                    
                        case 'toddler-program':
                            this.addMissionImage("https://littlepandakids.com/images/daycarem.webp", "Panda");
                            await this.delay(800);
                            await this.addMessageWithDelay("At Little Panda, we get that every family's schedule is different.", 'bot');
                            await this.delay(800);
                            await this.addMessageWithDelay("That’s why our premium daycare services offer flexible timings—so your child gets top-notch care whenever you need it.", 'bot');
                            await this.delay(800);
                            await this.addMessageWithDelay("Our warm, welcoming environment is designed for learning, playing, and growing, all under the watchful care of our trained and compassionate staff", 'bot');
                            await this.delay(800);
                            this.addMissionImage("https://i.pinimg.com/736x/58/fa/17/58fa178d29f5cbb38e152b2f81657dba.jpg", "Panda");
                            await this.delay(800);
                            
                            const dayCare = [
         
                                    { text: "Admission Enquiry", action: "admission", type: "primary" },
                                    { text: "Contact Us", action: "contact", type: "primary" },
                                    { text: "Back to Programs", action: "programs", type: "secondary" }
                                ];
                            await this.addMessageWithDelay("Interested in enrolling your little one or learning more?", 'bot');
                            await this.delay(800);
                            await this.addMessageWithDelay("Just click below for admission details and to get in touch with us!", 'bot',dayCare);
                            await this.delay(800);
                            break;
                        
                            case 'preschool-program':


                                this.addMissionImage("https://i.pinimg.com/736x/58/fa/17/58fa178d29f5cbb38e152b2f81657dba.jpg", "Panda");
                                await this.delay(800);
                                await this.addMessageWithDelay("At Little Panda , we offer a variety of age-tailored options to support your child's development at every stage—each filled with fun, creativity, and meaningful learning.", 'bot');
                                await this.delay(800);
                                
                                const preSchool = [
            
                                        { text: "Playgroup", action: "playgroup", type: "primary" },
                                        { text: "Nursery", action: "nursery", type: "primary" },
                                        { text: "Jr.KG", action: "jr-kg", type: "primary" },
                                        { text: "Sr.KG", action: "sr-kg", type: "primary" },
                                        { text: "Back to Programs", action: "programs", type: "secondary" }

                                    ];
                                
                                await this.addMessageWithDelay(" We Offer 4 Exciting Programs Tailored to Your Child’s Growth", 'bot',preSchool);
                                await this.delay(800);
                                break;
                            
                                case 'playgroup':
                                    this.addMissionImage("https://littlepandakids.com/images/classes/playgroup.webp", "Panda");
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Our little explorers dive into playful activities that spark curiosity and help them make new friends. They start recognizing colors, shapes, and numbers—all while building confidence and social skills through fun-filled learning", 'bot');
                                    await this.delay(800);
                                    const playgroup = [
         
                                    { text: "Admission Enquiry", action: "admission", type: "primary" },
                                    { text: "Contact Us", action: "contact", type: "primary" },
                                    { text: "Back to Programs", action: "preschool-program", type: "secondary" }
                                ];
                                    await this.addMessageWithDelay("Interested in enrolling your little one or learning more?", 'bot');
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Just click below for admission details and to get in touch with us!", 'bot',playgroup);
                                    await this.delay(800);
                                    break;

                                case 'nursery':
                                    this.addMissionImage("https://littlepandakids.com/images/classes/nursery.webp", "Panda");
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Creativity takes center stage here! With art, music, and storytelling, our nursery kids let their imaginations soar. Through painting, role-play, and interactive sessions, they grow emotionally, socially, and artistically.", 'bot');
                                    await this.delay(800);
                                    const nursery = [
         
                                    { text: "Admission Enquiry", action: "admission", type: "primary" },
                                    { text: "Contact Us", action: "contact", type: "primary" },
                                    { text: "Back to Programs", action: "preschool-program", type: "secondary" }
                                ];
                                    await this.addMessageWithDelay("Interested in enrolling your little one or learning more?", 'bot');
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Just click below for admission details and to get in touch with us!", 'bot',nursery);
                                    await this.delay(800);
                                    break;
                                
                                case 'jr-kg':
                                    this.addMissionImage("https://littlepandakids.com/images/classes/Jr%20kg.webp", "Panda");
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Hands-on fun that boosts brain power and confidence. From puzzles and games to outdoor adventures, our Jr. KG program supports holistic development—fostering creativity, motor skills, and problem-solving magic.", 'bot');
                                    await this.delay(800);
                                    const jr = [
         
                                    { text: "Admission Enquiry", action: "admission", type: "primary" },
                                    { text: "Contact Us", action: "contact", type: "primary" },
                                    { text: "Back to Programs", action: "preschool-program", type: "secondary" }
                                ];
                                    await this.addMessageWithDelay("Interested in enrolling your little one or learning more?", 'bot');
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Just click below for admission details and to get in touch with us!", 'bot',jr);
                                    await this.delay(800);
                                    break;

                                 case 'sr-kg':
                                    this.addMissionImage("https://littlepandakids.com/images/classes/Sr%20Kg.webp", "Panda");
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Ready for the big leap! Sr. KG is all about sharpening thinking skills, mastering literacy and numeracy, and growing independence. Activities here help kids understand time, space, and logic—preparing them for primary school and beyond.", 'bot');
                                    await this.delay(800);
                                    const sr = [
         
                                    { text: "Admission Enquiry", action: "admission", type: "primary" },
                                    { text: "Contact Us", action: "contact", type: "primary" },
                                    { text: "Back to Programs", action: "preschool-program", type: "secondary" }
                                ];
                                    await this.addMessageWithDelay("Interested in enrolling your little one or learning more?", 'bot');
                                    await this.delay(800);
                                    await this.addMessageWithDelay("Just click below for admission details and to get in touch with us!", 'bot',sr);
                                    await this.delay(800);
                                    break;

                                

                                

                            

                    
                    case 'admission':
                        await this.addMessageWithDelay(`I'd be happy to help with the admission process, ${this.userName}! 🎓`, 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("Our admissions team can provide detailed information about enrollment.", 'bot');
                        await this.delay(800);
                        
                        const admissionButtons = [
                           
                            { text: "Application Form", action: "application" },
                            { text: "Schedule Visit", action: "visit" },
                            { text: "Back to Menu", action: "main-menu", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("We'll guide you through every step of the process.", 'bot', admissionButtons);
                        break;

                    case 'application':
                        
                        await this.addMessageWithDelay(`Click here to fill out our <a href="https://littlepandakids.com/contact.html" target='_blank'>Enquiry Form</a> and let us help you get started at Little Panda Preschool & Daycare!`, 'bot');
                        await this.delay(800);
                        const application = [
                           
                         
                            { text: "Back to Admission Enquiry", action: "admission", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("Click below to go back",'bot', application);
                        break;

                    
                    case 'visit':
                        await this.addMessageWithDelay(`📅 Schedule a Visit Easily!  
You can book a visit by messaging us directly on WhatsApp.  
<a href="https://api.whatsapp.com/send/?phone=918600600033&text=Hi%20I’d%20like%20to%20book%20a%20school%20tour&type=phone_number&app_absent=0" target='_blank'>Click here to connect on WhatsApp</a>`, 'bot');
                        await this.delay(800);
                         const visit = [
                           
                         
                            { text: "Back to Admission Enquiry", action: "admission", type: "secondary" }
                        ];
                        await this.addMessageWithDelay( "Click below to go back",'bot', visit);
                        break;

                    
                    case 'contact':
                        
                        await this.addMessageWithDelay(`Here's how you can reach us, ${this.userName}! 📞`, 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("📍 Address: <a href='https://maps.app.goo.gl/cQsgMJS7XYD5taoG7' target='_blank'>Click Here To View Our Location</a>", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("📞 Phone: +91 86006 00033 or you can <a href='https://api.whatsapp.com/send/?phone=918600600033&text&type=phone_number&app_absent=0'  target='_blank'>Click Here</a> for WhatsApp contact", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("📧 Email: enquiry@littlepandakids.com <a href='mailto:enquiry@littlepandakids.com?subject=Preschool Admission Enquiry'  target='_blank'>Send us an Email</a>", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("🕒 Hours: Mon-Fri 8:30 AM - 7:30 PM", 'bot');
                        await this.delay(800);
                         const contact = [
                           
                         
                            { text: "Back to Main Menu", action: "main-menu", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("To Go Back Click Below ",'bot',contact);
                        break;
                       
                        
                        
                    
                    case 'faq':
                    this.currentStep = 'faq_input';
                    await this.addMessageWithDelay("Just type your question and I’ll do my best to help—still learning, though… I’m just a baby 🐼", 'bot');
                    this.showInput("Type your question here...");
                    break;
                    
                    case 'main-menu':
                        this.currentStep = 'main_menu';
                        this.hideInput(); 
                        this.showMainMenu(true);
                        break;

                
                    case 'ask-more-faq':
                    await this.addMessageWithDelay("Have more questions? We’re here to help—ask us about admissions, fees, daily routines, facilities, or anything else about life at Little Panda Preschool! 🐼", 'bot');
                    this.currentStep='faq_input' 
                    break;                        
                    // Additional handlers for sub-menu items
                    case 'mission':
                        this.addMissionImage("https://i.pinimg.com/736x/5a/46/99/5a469917d8cdb64806bdb013cd974dc5.jpg", "Panda");
                        await this.delay(800);
                        await this.addMessageWithDelay("We're on a mission to become edu-preneurs, and we believe that early child development is super important!", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("We think that the early years are crucial for a child's growth, and that's why we're passionate about creating a positive nurturing environment", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("That's why we created Little Panda, an Early Learning Centre that offers Premium Day Care at affordable rates and a Pre-school program that combines the best of Indian Culture and using Kreedo Curriculum to engage our children", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("We're all about giving your little ones the best possible start in life!", 'bot');
                        await this.delay(800);
                        
                        const missionButtons = [
                            { text: "Back to About Us", action: "about-us", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("Would you like to know more about us?", 'bot', missionButtons);
                        break;
                    
                   case 'Team':
    await this.addMessageWithDelay("Meet the amazing team at Little Panda! 🐼", 'bot');
    
    // Add team images with working placeholder URLs
    this.addImageMessage("https://i.pinimg.com/736x/03/5e/fc/035efcf3c52fb8a8e243fcb8c00ac7fd.jpg", "Principal");
    await this.delay(800);
    this.addImageMessage("https://i.pinimg.com/736x/0b/f9/de/0bf9de898afaeed49cf52505f3a392e3.jpg", "Lead Teacher");
    this.addImageMessage("https://i.pinimg.com/736x/a5/51/7d/a5517dd044d7f14cb29b9df352c2e1d3.jpg", "Assistant Teacher");
    
    await this.delay(800);
    
    const teamButtons = [
         { text: "Contact Us", action: "contact", type: "secondary" },
        { text: "Back to About Us", action: "about-us", type: "secondary" }
    ];
    await this.addMessageWithDelay("Our teachers and staff are passionate about early childhood education and dedicated to providing a nurturing environment for your little ones", 'bot', teamButtons);
    break;
                    
                    
                        case 'Testimonials':
                        this.addMissionImage("https://i.pinimg.com/736x/9d/c4/ae/9dc4ae5296eb3d08328c84b20aae9bc7.jpg", "Principal");
                        await this.delay(800);
                        await this.addMessageWithDelay("Our parents love us! Check out what Abir's parent and Ruhaan's parent have to say about Little Panda", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("Abir's Parent: 'Such a wonderful experience for our little one! The teachers are caring, and the environment is so nurturing.'<a href='https://www.instagram.com/reel/C-ee9SjtJyZ/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='  target='_blank'> (Watch the video)</a>", 'bot');
                        await this.delay(800);
                        await this.addMessageWithDelay("Ruhaan's Parent: 'We're so impressed with the growth and development of our child at Little Panda! The staff is dedicated and passionate.'<a href='https://www.instagram.com/reel/C-ZXyJSJuFc/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='  target='_blank'> (Watch the video )</a>", 'bot');
                        await this.delay(800);
                        
                        const testibuttons = [
                            { text: "Back to About Us", action: "about-us", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("Would you like to learn more about our approach?", 'bot', testibuttons);
                        break;
                    
                    case 'enrollment':
                        await this.addMessageWithDelay("Our enrollment process is simple! We start with a tour, followed by an application, meet & greet session, and then enrollment completion. We're here to guide you every step of the way! 📝", 'bot');
                        await this.delay(800);
                        
                        const enrollmentButtons = [
                            { text: "Schedule Tour", action: "visit" },
                            { text: "Back to Admission", action: "admission", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("Would you like to schedule a tour?", 'bot', enrollmentButtons);
                        break;
                    
                    case 'hours-faq':
                        await this.addMessageWithDelay("We're open Monday through Friday from 7:00 AM to 6:00 PM. We also offer extended care options for working parents. 🕐", 'bot');
                        await this.delay(800);
                        
                        const hoursButtons = [
                            { text: "Extended Care Info", action: "extended-care" },
                            { text: "Back to FAQ", action: "faq", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("Need information about extended care?", 'bot', hoursButtons);
                        break;
                    
                    default:
                        await this.addMessageWithDelay(`I'm still working on that section, ${this.userName}! Our team will be happy to provide more details. Is there anything else I can help you with? 🤖`, 'bot');
                        await this.delay(800);
                        
                        const defaultButtons = [
                            { text: "Back to Menu", action: "main-menu", type: "secondary" }
                        ];
                        await this.addMessageWithDelay("Let me know how else I can help!", 'bot', defaultButtons);
                }
            }

            async handleFAQResponse(question) {
    try {
        // this.updateApiStatus('Getting answer...');
        
        const response = await fetch(`${this.faqURL}?question=${encodeURIComponent(question)}`);
        const data = await response.json();
        
        if (data.success) {
            // this.updateApiStatus('Answer found ✓');
            await this.addMessageWithDelay(data.answer, 'bot');
        } else {
            // this.updateApiStatus('No answer found');
            await this.addMessageWithDelay("Oh ho! I don't know about that. 🤔 Could you try asking about fees, admission, hostel, library, placement, or anything else?", 'bot');
        }
    } catch (error) {
        // this.updateApiStatus('Error');
        console.error('FAQ API Error:', error);
        await this.addMessageWithDelay("Oops! Something went wrong. 😅 Please try asking your question again.", 'bot');
    }
    
    // Reset status after 3 seconds
    // setTimeout(() => {
    //     this.updateApiStatus('Online');
    // }, 3000);
    
    // Show options to continue asking or go back
    await this.delay(800);
    const continueButtons = [
    { text: "Ask Another Question", action: "ask-more-faq", type: "primary" },
    { text: "Back to Menu", action: "main-menu", type: "secondary" },
    {
        text: "Talk To Teacher",
        action: "contact",
        type: "secondary",
        link: "https://api.whatsapp.com/send/?phone=918600600033&text=Hi%20I’d%20like%20to%20speak%20with%20a%20teacher&type=phone_number&app_absent=0"
    }
];


await this.addMessageWithDelay(
    "Would you like to ask another question? Or you can speak with our teacher to guide you better.",
    'bot',
    continueButtons
);

}

            async handleGeneralMessage(message) {
                const lowerMessage = message.toLowerCase();
                let response = `Thanks for your message, ${this.userName}! `;

                if (lowerMessage.includes('thank')) {
                    response += "You're very welcome! I'm happy to help. Is there anything else you'd like to know about Little Panda? 😊";
                } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
                    response += "Goodbye! Feel free to reach out anytime. Have a wonderful day! 🐼👋";
                } else if (lowerMessage.includes('help')) {
                    response += "I'm here to help! You can ask me about our programs, admission process, or anything else about Little Panda.";
                } else {
                    response += "I understand. Let me help you find the information you need!";
                }

                const buttons = [
                    { text: "About Us", action: "about-us" },
                    { text: "Programs", action: "programs" },
                    { text: "Admission", action: "admission" },
                    { text: "Contact", action: "contact", type: "secondary" }
                ];

                await this.addMessageWithDelay(response, 'bot', buttons);
            }

            addMessage(content, sender, buttons = null) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${sender}`;
                
                const avatar = document.createElement('div');
                avatar.className = 'message-avatar';
                avatar.textContent = sender === 'bot' ? '🐼' : '👩‍👦';
                
                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                messageContent.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(messageContent);
                
                this.chatMessages.appendChild(messageDiv);
                
                // Add buttons below bot message if provided
                if (sender === 'bot' && buttons && buttons.length > 0) {
                    const buttonsContainer = document.createElement('div');
                    buttonsContainer.className = 'message-buttons';
                    
                    buttons.forEach(button => {
                        const btn = document.createElement('button');
                        btn.className = `chat-button-option ${button.type === 'secondary' ? 'secondary' : ''}`;
                        btn.textContent = button.text;
                        btn.dataset.action = button.action;
                        buttonsContainer.appendChild(btn);
                    });
                    
                    this.chatMessages.appendChild(buttonsContainer);
                }
                
                this.scrollToBottom();
            }
            addImageMessage(imageUrl, altText = 'Image') {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    const imageId = 'img_' + Date.now() + '_' + Math.random(); // Make ID more unique
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🐼';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = altText;
    img.className = 'team-image';
    img.id = imageId;
    img.onerror = function() { this.style.display = 'none'; };
    
    // Add click event immediately with proper binding
    img.addEventListener('click', (e) => {
        e.preventDefault();
        this.openImageModal(e.target.src);
    });
    
    messageContent.appendChild(img);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
}

            addPandaImage() {
                const imageDiv = document.createElement('div');
                imageDiv.className = 'welcome-message';
                imageDiv.innerHTML = '<div class="panda-image">🐼</div>';
                this.chatMessages.appendChild(imageDiv);
                this.scrollToBottom();
            }

            showTyping() {
                this.typingIndicator.style.display = 'flex';
                this.scrollToBottom();
            }

            hideTyping() {
                this.typingIndicator.style.display = 'none';
            }

            scrollToBottom() {
                setTimeout(() => {
                    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                }, 100);
            }

            updateApiStatus(status) {
                this.apiStatus.textContent = status;
            }

            delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        }
       

        // Initialize the chatbot when the page loads
        document.addEventListener('DOMContentLoaded', () => {
            new PandaBot();
        });