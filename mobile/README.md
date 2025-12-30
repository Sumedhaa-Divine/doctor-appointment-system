# TeleHealth India - Mobile Apps

This directory contains all Flutter mobile applications for the TeleHealth India platform.

## Apps

### 1. Patient App
Mobile app for patients to book appointments, consult with doctors, and manage health records.

**Features**:
- User registration and login
- Search and book doctors
- Video consultations
- Prescription management
- Medical records upload
- Payment integration
- Appointment reminders

### 2. Doctor App
Mobile app for doctors to manage their practice and consult with patients.

**Features**:
- Schedule management
- Patient appointments
- Video consultations
- Digital prescriptions
- Patient medical history
- Earnings dashboard
- Availability settings

### 3. Admin App
Mobile app for administrators to manage the platform.

**Features**:
- User management (patients, doctors, staff)
- Role-based access control
- Analytics and reports
- Payment oversight
- System settings
- Audit logs

## Tech Stack

### Core
- **Flutter**: 3.x
- **Dart**: 3.x
- **State Management**: Riverpod 2.x
- **Navigation**: GoRouter

### Networking
- **HTTP Client**: Dio
- **API Client**: Retrofit
- **Serialization**: json_serializable

### Video
- **Video SDK**: Agora RTC Engine
- **Permissions**: permission_handler
- **Screen Wake**: wakelock_plus

### Payments
- **Razorpay**: razorpay_flutter
- **Custom Integration**: For Paytm & Cashfree

### Storage
- **Local DB**: Hive
- **Secure Storage**: flutter_secure_storage
- **Shared Preferences**: shared_preferences

### Firebase
- **Core**: firebase_core
- **Push Notifications**: firebase_messaging
- **Analytics**: firebase_analytics
- **Crashlytics**: firebase_crashlytics

### UI/UX
- **Fonts**: google_fonts
- **Images**: cached_network_image
- **SVG**: flutter_svg
- **Animations**: lottie
- **Loading**: shimmer

## Project Structure

```
mobile/
├── patient_app/
│   ├── lib/
│   │   ├── core/
│   │   │   ├── app.dart                    # Main app widget
│   │   │   ├── config/                     # App configuration
│   │   │   │   ├── environment.dart        # Environment variables
│   │   │   │   └── theme.dart             # App theme
│   │   │   ├── constants/                  # Constants
│   │   │   ├── services/                   # Core services
│   │   │   │   ├── api_service.dart       # API client
│   │   │   │   ├── auth_service.dart      # Authentication
│   │   │   │   ├── storage_service.dart   # Local storage
│   │   │   │   └── notification_service.dart
│   │   │   └── utils/                      # Utilities
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── data/                  # Data layer
│   │   │   │   │   ├── models/            # Data models
│   │   │   │   │   ├── repositories/      # Repositories
│   │   │   │   │   └── api/               # API clients
│   │   │   │   ├── domain/                # Domain layer
│   │   │   │   │   ├── entities/          # Entities
│   │   │   │   │   └── usecases/          # Use cases
│   │   │   │   └── presentation/          # Presentation layer
│   │   │   │       ├── screens/           # Screens/Pages
│   │   │   │       ├── widgets/           # Widgets
│   │   │   │       └── providers/         # State providers
│   │   │   ├── appointment/
│   │   │   ├── consultation/
│   │   │   ├── payment/
│   │   │   ├── medical_records/
│   │   │   ├── profile/
│   │   │   └── router/                    # Navigation
│   │   └── main.dart                      # Entry point
│   ├── android/                           # Android configuration
│   ├── ios/                               # iOS configuration
│   ├── assets/                            # Assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── animations/
│   ├── test/                              # Tests
│   └── pubspec.yaml                       # Dependencies
├── doctor_app/                            # Similar structure
└── admin_app/                             # Similar structure
```

## Getting Started

### Prerequisites

1. **Install Flutter**
   ```bash
   # macOS
   brew install flutter

   # Or download from https://flutter.dev/docs/get-started/install
   ```

2. **Verify Installation**
   ```bash
   flutter doctor
   ```

3. **Install Dependencies**
   - Android Studio (for Android development)
   - Xcode (for iOS development, macOS only)

### Setup

1. **Navigate to app directory**
   ```bash
   cd mobile/patient_app
   ```

2. **Get dependencies**
   ```bash
   flutter pub get
   ```

3. **Generate code**
   ```bash
   flutter pub run build_runner build --delete-conflicting-outputs
   ```

4. **Configure environment**

   Create `lib/core/config/environment.dart`:
   ```dart
   class Environment {
     static const String apiBaseUrl = 'http://localhost:3000/api/v1';
     static const String agoraAppId = 'your-agora-app-id';
     static const String razorpayKey = 'rzp_test_xxx';
   }
   ```

5. **Configure Firebase**

   - Download `google-services.json` (Android)
   - Download `GoogleService-Info.plist` (iOS)
   - Place in respective directories

### Run

**Android**:
```bash
flutter run
```

**iOS**:
```bash
flutter run -d ios
```

**Specific device**:
```bash
# List devices
flutter devices

# Run on specific device
flutter run -d <device-id>
```

## Development

### Code Generation

Run this after modifying models, repositories, or providers:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

**Watch mode** (auto-regenerate on file changes):
```bash
flutter pub run build_runner watch --delete-conflicting-outputs
```

### State Management (Riverpod)

**Creating a provider**:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final userProvider = StateProvider<User?>((ref) => null);

// Or use code generation
@riverpod
class UserNotifier extends _$UserNotifier {
  @override
  User? build() => null;

  void setUser(User user) {
    state = user;
  }
}
```

**Using a provider**:
```dart
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);

    return Text('Hello ${user?.name ?? "Guest"}');
  }
}
```

### Navigation (GoRouter)

**Define routes**:
```dart
final appRouter = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => HomeScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginScreen(),
    ),
  ],
);
```

**Navigate**:
```dart
context.go('/login');
context.push('/profile');
context.pop();
```

### API Integration

**Define API client**:
```dart
@RestApi(baseUrl: Environment.apiBaseUrl)
abstract class AuthApi {
  factory AuthApi(Dio dio) = _AuthApi;

  @POST('/auth/login')
  Future<LoginResponse> login(@Body() LoginRequest request);

  @POST('/auth/register')
  Future<RegisterResponse> register(@Body() RegisterRequest request);
}
```

**Use in repository**:
```dart
class AuthRepository {
  final AuthApi _api;

  AuthRepository(this._api);

  Future<User> login(String email, String password) async {
    final response = await _api.login(
      LoginRequest(email: email, password: password),
    );
    return response.user;
  }
}
```

## Testing

### Unit Tests

```bash
flutter test
```

### Widget Tests

```bash
flutter test test/widgets/
```

### Integration Tests

```bash
flutter drive --target=test_driver/app.dart
```

### Coverage

```bash
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

## Building

### Android

**Debug APK**:
```bash
flutter build apk --debug
```

**Release APK**:
```bash
flutter build apk --release
```

**App Bundle** (for Play Store):
```bash
flutter build appbundle --release
```

**Output**: `build/app/outputs/`

### iOS

**Debug**:
```bash
flutter build ios --debug
```

**Release**:
```bash
flutter build ios --release
```

**Archive** (for App Store):
```bash
# Open in Xcode
open ios/Runner.xcworkspace

# Then use Xcode to archive and upload
```

## Configuration

### Android Configuration

**App ID**: Edit `android/app/build.gradle`
```gradle
defaultConfig {
    applicationId "com.telehealth.india.patient"
    minSdkVersion 21
    targetSdkVersion 33
    versionCode 1
    versionName "1.0.0"
}
```

**Permissions**: Edit `android/app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### iOS Configuration

**Bundle ID**: Edit `ios/Runner.xcodeproj/project.pbxproj`

**Permissions**: Edit `ios/Runner/Info.plist`
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required for video consultations</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is required for video consultations</string>
```

## Common Issues

### Issue: Flutter not found

```bash
export PATH="$PATH:`pwd`/flutter/bin"
```

### Issue: CocoaPods not installed (iOS)

```bash
sudo gem install cocoapods
cd ios && pod install
```

### Issue: Gradle build fails (Android)

```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
```

### Issue: Code generation not working

```bash
flutter clean
flutter pub get
flutter pub run build_runner clean
flutter pub run build_runner build --delete-conflicting-outputs
```

## Best Practices

### File Naming
- Screens: `home_screen.dart`
- Widgets: `user_card_widget.dart`
- Models: `user_model.dart`
- Providers: `user_provider.dart`

### Code Organization
- One widget per file (for main widgets)
- Group related widgets in same file (if small)
- Keep widgets under 300 lines
- Extract complex logic to separate classes

### State Management
- Use `ConsumerWidget` for widgets that read state
- Use `ConsumerStatefulWidget` for stateful widgets with state
- Keep business logic in providers/repositories
- Don't put business logic in widgets

### Performance
- Use `const` constructors where possible
- Avoid rebuilding entire trees
- Use `ListView.builder` for long lists
- Cache network images
- Dispose controllers and subscriptions

### Error Handling
- Always handle API errors
- Show user-friendly error messages
- Log errors to Crashlytics
- Implement retry mechanisms

## Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Riverpod Documentation](https://riverpod.dev)
- [Agora Flutter SDK](https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=flutter)
- [Razorpay Flutter](https://razorpay.com/docs/payment-gateway/flutter/)

## Support

For issues or questions, please contact:
- Email: dev@telehealth-india.com
- Slack: #mobile-dev channel
