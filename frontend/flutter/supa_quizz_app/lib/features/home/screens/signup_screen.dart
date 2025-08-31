import 'package:flutter/material.dart';
import '../../../core/services/auth_service.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});
  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _form = GlobalKey<FormState>();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;
  String? _success;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
      _success = null;
    });

    final res = await AuthService.signup(
      username: _username.text.trim(),
      email: _email.text.trim(),
      password: _password.text,
    );

    setState(() => _loading = false);
    if (res["ok"] == true) {
      setState(() => _success = "Compte créé ! Vous pouvez vous connecter.");
      Future.delayed(
          const Duration(milliseconds: 800), () => Navigator.pop(context));
    } else {
      setState(() => _error =
          res["data"]["message"]?.toString() ?? "Échec de l'inscription");
    }
  }

  InputDecoration _inputDecoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white),
        enabledBorder: const OutlineInputBorder(
          borderSide: BorderSide(color: Colors.white),
        ),
        focusedBorder: const OutlineInputBorder(
          borderSide: BorderSide(color: Colors.purple),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          title: const Text("Créer un compte",
              style: TextStyle(color: Colors.white)),
          backgroundColor: Colors.black),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _form,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextFormField(
                  controller: _username,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration("Nom d'utilisateur"),
                  validator: (v) =>
                      (v == null || v.isEmpty) ? "Nom requis" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration("Email"),
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) =>
                      (v == null || v.isEmpty) ? "Email requis" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  style: const TextStyle(color: Colors.white),
                  decoration: _inputDecoration("Mot de passe"),
                  obscureText: true,
                  validator: (v) => (v != null && v.length >= 6)
                      ? null
                      : "6 caractères minimum",
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                ],
                if (_success != null) ...[
                  const SizedBox(height: 8),
                  Text(_success!, style: const TextStyle(color: Colors.green)),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const CircularProgressIndicator()
                        : const Text("Créer mon compte"),
                  ),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
