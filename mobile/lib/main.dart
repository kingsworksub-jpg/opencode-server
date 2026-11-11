import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(const OpenCodeMobileApp());
}

class OpenCodeMobileApp extends StatelessWidget {
  const OpenCodeMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OpenCode Mobile',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const ChatScreen(),
    );
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  ChatMessage({required this.text, required this.isUser});
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final TextEditingController _urlController = TextEditingController(text: 'http://100.87.195.37:3000');
  final TextEditingController _tokenController = TextEditingController(text: 'opencode-secret-token');
  final List<ChatMessage> _messages = [];
  final List<String> _debugLogs = [];
  bool _isLoading = false;

  void _addLog(String log) {
    final timestamp = DateTime.now().toIso8601String().split('T').last.substring(0, 8);
    setState(() {
      _debugLogs.add('[$timestamp] $log');
    });
  }

  void _openSettings() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Server Settings & Debug'),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: _urlController,
                    decoration: const InputDecoration(
                      labelText: 'Server Base URL',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _tokenController,
                    decoration: const InputDecoration(
                      labelText: 'Bearer Token',
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 20),
                  const Text('Connection & Session Logs:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    height: 150,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.black87,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: ListView.builder(
                      itemCount: _debugLogs.length,
                      itemBuilder: (context, index) {
                        return Text(
                          _debugLogs[index],
                          style: const TextStyle(color: Colors.greenAccent, fontSize: 11, fontFamily: 'monospace'),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {
                        setState(() {
                          _debugLogs.clear();
                        });
                        Navigator.pop(context);
                        _openSettings();
                      },
                      child: const Text('Clear Logs', style: TextStyle(color: Colors.red)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add(ChatMessage(text: text, isUser: true));
      _isLoading = true;
    });
    _controller.clear();

    final baseUrl = _urlController.text.replaceAll(' ', '').trim().replaceAll(RegExp(r'\/+$'), '');
    final endpoint = '$baseUrl/api/execute';
    final token = _tokenController.text.trim();

    _addLog('Sending POST to $endpoint with command: "$text"');

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'command': text}),
      ).timeout(const Duration(seconds: 15));

      _addLog('Response status: ${response.statusCode}');
      _addLog('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final output = data['success'] == true ? data['stdout'] : 'Error: ${data['error']}\n${data['stderr']}';
        setState(() {
          _messages.add(ChatMessage(text: output.isEmpty ? '(Command executed with no output)' : output, isUser: false));
        });
      } else {
        setState(() {
          _messages.add(ChatMessage(text: 'Server error: ${response.statusCode} - ${response.body}', isUser: false));
        });
      }
    } catch (e) {
      _addLog('Exception caught: $e');
      setState(() {
        _messages.add(ChatMessage(text: 'Connection failed ($endpoint): $e', isUser: false));
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OpenCode Mobile Remote'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _openSettings,
            tooltip: 'Server Settings & Debug',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(8.0),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return Align(
                  alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4.0, horizontal: 8.0),
                    padding: const EdgeInsets.all(12.0),
                    decoration: BoxDecoration(
                      color: msg.isUser ? Colors.blue[100] : Colors.grey[200],
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    child: Text(
                      msg.text,
                      style: const TextStyle(fontFamily: 'monospace'),
                    ),
                  ),
                );
              },
            ),
          ),
          if (_isLoading) const LinearProgressIndicator(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: 'Enter command or prompt...',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8.0),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: _isLoading ? null : _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
