// EmergencyScreen.tsx — Emergency contacts + quick SOS (fullscreen)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Linking, Modal, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMockEmergencyContacts, EmergencyContact } from '../services/MockDataService';
import * as Haptics from 'expo-haptics';

export const EmergencyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<EmergencyContact[]>(getMockEmergencyContacts());
  const [sosActive, setSosActive] = useState(false);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

  const handleSOS = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setSosActive(true);
    Alert.alert(
      '🆘 SOS Activated',
      'Your location and vitals are being sent to your emergency contacts. Call 911?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSosActive(false) },
        { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
      ]
    );
  };

  const handleCall = (contact: EmergencyContact) => {
    Alert.alert(
      `Call ${contact.name}?`,
      contact.phone,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL(`tel:${contact.phone}`) },
      ]
    );
  };

  const handleText = (contact: EmergencyContact) => {
    Linking.openURL(`sms:${contact.phone}?body=I need help. Please check on me. - Sent from AI Health Partner`);
  };

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setRelationship('');
    setPhone('');
    setIsModalVisible(true);
  };

  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setRelationship(contact.relationship);
    setPhone(contact.phone);
    setIsModalVisible(true);
  };

  const saveContact = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Error', 'Name and Phone are required');
      return;
    }

    if (editingContact) {
      // Edit
      setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, name, relationship, phone } : c));
    } else {
      // Add
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        name,
        relationship,
        phone,
      };
      setContacts(prev => [...prev, newContact]);
    }
    setIsModalVisible(false);
  };

  const deleteContact = (id: string) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            setContacts(prev => prev.filter(c => c.id !== id));
            setIsModalVisible(false);
          }
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0A1A', '#1A0A0A', '#0A0A1A']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.subtitle}>Instant access when you need it most</Text>

        {/* Big SOS Button */}
        <TouchableOpacity onPress={handleSOS} activeOpacity={0.85} style={styles.sosBtnWrapper}>
          <LinearGradient
            colors={sosActive ? ['#7f0000', '#c0392b'] : ['#C0392B', '#E74C3C']}
            style={styles.sosBtn}
          >
            <Text style={styles.sosEmoji}>🆘</Text>
            <Text style={styles.sosTitle}>Send SOS Alert</Text>
            <Text style={styles.sosSub}>Notifies all emergency contacts instantly with your location & vitals</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 911 direct button */}
        <TouchableOpacity
          style={styles.call911Btn}
          onPress={() => Linking.openURL('tel:911')}
        >
          <Text style={styles.call911Text}>📞 Call 911</Text>
        </TouchableOpacity>

        {/* Emergency Contacts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Emergency Contacts</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {contacts.map(contact => (
          <TouchableOpacity
            key={contact.id}
            style={styles.contactCard}
            onPress={() => openEditModal(contact)}
            activeOpacity={0.7}
          >
            <View style={styles.contactAvatar}>
              <Text style={styles.contactInitial}>{contact.name[0]}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactRelation}>{contact.relationship}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleCall(contact)}>
                <Text style={styles.actionIcon}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.smsBtn]} onPress={() => handleText(contact)}>
                <Text style={styles.actionIcon}>💬</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {/* Edit/Add Modal */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'Add New Contact'}</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.closeText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Sarah Johnson"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Relationship</Text>
                <TextInput
                  style={styles.input}
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="e.g. Spouse / Doctor"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. +1 (555) 000-0000"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalActions}>
                {editingContact && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteContact(editingContact.id)}
                  >
                    <Text style={styles.deleteBtnText}>Delete Contact</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.saveBtn} onPress={saveContact}>
                  <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.saveBtnGradient}>
                    <Text style={styles.saveBtnText}>Save Contact</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </Modal>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ How it works</Text>
          <Text style={styles.infoText}>
            When an anomaly is detected in your vitals, AI Health Partner can automatically alert your contacts with your GPS location, heart rate, and a pre-written message. You can always dismiss or confirm alerts before sending.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4, marginBottom: 24 },
  sosBtnWrapper: { borderRadius: 28, overflow: 'hidden', marginBottom: 14 },
  sosBtn: {
    padding: 32, alignItems: 'center',
    borderRadius: 28,
  },
  sosEmoji: { fontSize: 52 },
  sosTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginTop: 12 },
  sosSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, textAlign: 'center', lineHeight: 18 },
  call911Btn: {
    backgroundColor: 'rgba(231,76,60,0.18)', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center', marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.35)',
  },
  call911Text: { fontSize: 18, fontWeight: '800', color: '#E74C3C' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  addBtn: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.4)',
  },
  addBtnText: { color: '#A29BFE', fontWeight: '700', fontSize: 13 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  contactAvatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  contactInitial: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  contactRelation: { fontSize: 12, color: '#A29BFE', fontWeight: '600', marginTop: 2 },
  contactPhone: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  contactActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  smsBtn: { backgroundColor: 'rgba(108,92,231,0.2)' },
  actionIcon: { fontSize: 18 },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20,
    padding: 18, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  infoText: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 22 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  closeText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalActions: { marginTop: 10 },
  saveBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 12 },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  deleteBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteBtnText: { color: '#FF4757', fontWeight: '600', fontSize: 14 },
});
