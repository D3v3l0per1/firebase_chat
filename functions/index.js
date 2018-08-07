/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Note: You will edit this file in the follow up codelab about the Cloud Functions for Firebase.

// TODO(DEVELOPER): Import the Cloud Functions for Firebase and the Firebase Admin modules here.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// TODO(DEVELOPER): Write the addWelcomeMessages Function here.
exports.addWelcomeMessages = functions.auth.user().onCreate(async (user) => {
    console.log('A new user signed in for the first time!');
    const fullName = user.displayName || 'Anonymos';

    // Saves the new Welcome message into database
    await admin.database().ref('messages').push({
        name: 'Firebase Bot',
        profilePicUrl: '/images/firebase-logo.png',
        text: `${fullName} signed in for the first time! Welcome!`,
    });
    console.log('Welcome message written to db.');
})

// TODO(DEVELOPER): Write the blurOffensiveImages Function here.

// TODO(DEVELOPER): Write the sendNotifications Function here.
exports.sendNotifications = functions.database.ref('/messages/{messageId}').onCreate(
    async (snapshot) => {
        const text = snapshot.val().text;
        const payload = {
            notification: {
                title: `${snapshot.val().name} posted ${text ? 'a message' : 'an image'}`,
                body: text ? (text.length <= 100 ? text: text.substring(0, 97) + '...') : '',
                icon: snapshot.val().photoUrl || '/images/profile_placeholder.png',
                click_action: `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`,
            }
        };

        // Get the list of device tokens
        const allTokens = await admin.database().ref('fcmTokens').once('value');
        if (allTokens.exists()) {
            const tokens = Object.keys(allTokens.val());

            // Send notifications to ll tokens
            const response = await admin.messaging().sendToDevice(tokens, payload);
            await cleanUpTokens(response, tokens);
            console.log('Notifications have been sent and tokens cleanedup');
        }
    }
);

function cleanUpTokens (response, tokens) {
    const tokensToRemove = {};
    response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
            console.log('Faillure sending notfication to ', tokens[index], error);
            if (error.code === 'messaging/invalid-registraation-token' ||
                error.code === 'messaging/registration-token-not-registred') {
                    tokensToRemove[`/fcmTokens/${tokens[index]}`] = null;
                }
        }
    });
    return admin.database().ref().update(tokensToRemove)
}