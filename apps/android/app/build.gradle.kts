plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}
val releaseApiUrl = providers.gradleProperty("releaseApiUrl").orElse("https://unconfigured.invalid").get()
require(releaseApiUrl.startsWith("https://")) { "Release API must use HTTPS" }
android {
    namespace = "com.fretenow.app"
    compileSdk = 36
    defaultConfig { applicationId = "com.fretenow.app"; minSdk = 26; targetSdk = 36; versionCode = 1; versionName = "0.1.0" }
    buildTypes {
        debug { buildConfigField("String", "API_URL", "\"http://10.0.2.2:4100\"") }
        release { buildConfigField("String", "API_URL", "\"$releaseApiUrl\""); isMinifyEnabled = false }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.08.01"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
}
