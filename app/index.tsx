import React from 'react';
import { View } from 'react-native';

export default function Index() {
    // This serves as the root fallback while useAuthRedirect performs the actual routing.
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
}
