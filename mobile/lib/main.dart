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
  bool _isLoading = false;

  void _openSettings() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Server Settings'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _urlController,
                decoration: const InputDecoration(
                  labelText: 'Server Base URL (e.g. http://192.168.x.x:3000)',
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
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Save'),
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

    final baseUrl = _urlController.text.trim().replaceAll(RegExp(r'\/+$'), '');
    final endpoint = '$baseUrl/api/execute';
    final token = _tokenController.text.trim();

    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'command': text}),
      );

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
            tooltip: 'Server Settings',
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
