Gemini Vibe Coding Prompt: AI Health Partner Frontend

Context

This prompt is for the frontend development of an AI-powered iPhone and Apple Watch application for the Axxess hackathon. The project aims to create a proactive health companion that offers AI-driven physical and mental check-ins, facilitates emergency connectivity, and provides personalized recovery plans. The application will leverage Apple's HealthKit and WatchOS capabilities, alongside AI for predictive analytics and personalized interventions. The goal is to produce a functional and aesthetically pleasing prototype that demonstrates the potential of this AI-driven health partner, adhering to Apple's Human Interface Guidelines for a native feel.

Project Vision: AI-Driven Preventive Health Partner

Our core idea is to empower users to manage their health proactively, with a seamless and intuitive experience across their Apple devices. This involves:

•
AI-driven physical and mental check-ins: Utilizing sensor data and user input to assess well-being, track data, and proactively identify potential health issues.

•
Emergency connectivity: Providing a link to emergency services or medical institutions during critical events, with smart alerts to caregivers or clinicians.

•
Personalized recovery plans: Offering AI-generated recommendations for post-event recovery or ongoing health management, including diet and lifestyle coaching, and patient-friendly summaries of medical information.

Target Audience & Vibe

Our target audience includes individuals focused on preventive health, those managing chronic conditions, elderly users, and people in high-stress professions. The app's aesthetic and interaction should convey an empathetic and supportive tone, ensuring the UI feels reassuring rather than alarming. The design should be clean and intuitive, featuring minimalist elements and easy navigation, especially crucial for the WatchOS experience. It should encourage proactive and engaging user interaction without being intrusive, maintaining a modern and polished appearance consistent with Apple's native applications.

Core Frontend Features

1. AI Physical Check-in (WatchOS & iOS)

For Real-time Vitals Display, the WatchOS interface will feature a primary complication or glance showing the current heart rate and a summary of recent activity. A dedicated app screen will display live heart rate, respiratory rate, and a simple trend graph, utilizing visual cues like color changes to indicate anomalies. On iOS, a comprehensive dashboard will summarize daily and weekly trends for heart rate, respiratory rate, and activity, offering detailed graphs and historical data access.

Anomaly Alerts will be delivered via haptic feedback and brief on-screen notifications on WatchOS for detected issues such as unusual heart rates or fall detection. Users will have the option to dismiss the alert or take immediate action, such as
calling an emergency contact. iOS will provide push notifications for anomalies, allowing users to view details or initiate contact.

2. AI Mental Check-in (WatchOS & iOS)

A Daily Check-in Prompt will appear as a subtle notification on WatchOS, enabling quick mood ratings through simple taps. The iOS app will offer a more comprehensive check-in flow, potentially incorporating voice input or text-based journaling, and integrating with Apple Health's "State of Mind" API. A Gamified Mental Status Assessment will be included on both iOS and WatchOS, featuring a short, engaging game (e.g., memory or reaction time task) designed for cognitive assessment. This game should be simple enough for WatchOS interaction while maintaining visual appeal on iOS. An AI Chat Assistant on iOS will provide a conversational interface for users to express feelings, receive support, and obtain personalized recommendations, serving as the primary mental health support channel.

3. Emergency Connectivity (WatchOS & iOS)

An Emergency Contact List will be managed within a dedicated section on the iOS app, allowing users to add family, friends, and clinicians. For Delegated Call/SMS, WatchOS will feature a quick action button, activated after an anomaly or fall, to call or text a pre-selected emergency contact, requiring a confirmation step. Similar functionality will be available on iOS, with options to send pre-written messages or initiate calls.

4. Personalized Recovery Plans (iOS)

The iOS app will present a Recovery Dashboard, visually engaging and easy to understand, displaying active recovery plans, daily tasks, and progress tracking. Task Management will integrate recovery tasks into daily routines, with WatchOS complications providing a quick overview of tasks. Patient-Friendly Summaries on iOS will display simplified medical information and recovery guidelines, generated from FHIR data, in an accessible format.

Technical Considerations for Gemini

•
Language: Swift & SwiftUI (for both iOS and watchOS).

•
Data Handling:

•
HealthKit: For reading and writing health data (heart rate, respiratory rate, activity, State of Mind).

•
Core Motion: For fall detection notifications.

•
SwiftData: For local, on-device persistence of user preferences, game progress, and cached recovery tasks.



•
AI Integration:

•
Core ML: For integrating pre-trained models for on-device anomaly detection and cognitive assessment game logic.

•
API Calls: For interacting with cloud-based AI (e.g., OpenAI GPT-4o-mini for chat and recovery plan generation) and FHIR servers.



•
UI/UX: Adherence to Apple Human Interface Guidelines for a native and intuitive experience.

•
Performance: Optimize for battery life, especially on WatchOS.

Instructions for Gemini

Your task is to "vibe code" the frontend of this application. Focus on creating a clean, intuitive, and empathetic user interface for both iOS and watchOS. Prioritize the user experience and the seamless integration of health data and AI insights. Provide code snippets and architectural guidance for the SwiftUI views, HealthKit integrations, and Core ML model usage. Assume mock data for AI responses and FHIR data where actual API calls are not yet implemented.

Deliverables:

•
SwiftUI code for key screens on both iOS and watchOS (e.g., Vitals Dashboard, Mental Check-in, Emergency Actions, Recovery Plan).

•
Example code for HealthKit data retrieval and storage.

•
Guidance on integrating Core ML models for on-device AI.

•
Suggestions for UI/UX best practices for health applications.

Let your creativity flow while keeping the core vision and technical constraints in mind. We're looking for a functional and aesthetically pleasing prototype that demonstrates the potential of this AI-driven health partner!

Constraints

•
No Backend Implementation: Focus solely on the frontend UI/UX and client-side logic. Mock data should be used for any data that would typically come from a backend API.

•
HealthKit Permissions: Assume all necessary HealthKit permissions are granted by the user.

•
Core ML Model Availability: Assume pre-trained Core ML models are available for integration; focus on the integration aspect rather than model training.

•
Hackathon Scope: Prioritize core features and a polished user experience over exhaustive functionality. The goal is a compelling prototype.

•
SwiftUI First: All UI should be built using SwiftUI. Avoid UIKit unless absolutely necessary for a specific component not available in SwiftUI.

•
Accessibility: Consider basic accessibility features for all UI components.

