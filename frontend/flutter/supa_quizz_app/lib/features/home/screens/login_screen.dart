import 'package:flutter/material.dart';
import '../../../core/services/auth_service.dart';
import '../../home/screens/home_screen.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final res = await AuthService.login(_email.text.trim(), _password.text);
    setState(() => _loading = false);

    if (res["ok"] == true) {
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (_) => false,
      );
    } else {
      setState(() =>
          _error = res["data"]["message"]?.toString() ?? "Connexion refusée");
    }
  }

  InputDecoration _inputDecoration(String label) => const InputDecoration(
        labelText: '',
        labelStyle: TextStyle(color: Colors.white),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: Colors.white),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(color: Colors.purple),
        ),
      ).copyWith(labelText: label);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            color: Colors.black87,
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _form,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // --- Logo ---
                    Padding(
                      padding: const EdgeInsets.only(top: 8, bottom: 12),
                      child: Image.asset(
                        'assets/logo/LogoSupaQuiz.png',
                        height: 72,
                        fit: BoxFit.contain,
                      ),
                    ),
                    const Text(
                      "Connexion",
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
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
                      validator: (v) => (v == null || v.isEmpty)
                          ? "Mot de passe requis"
                          : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const CircularProgressIndicator()
                            : const Text("Se connecter"),
                      ),
                    ),
                    TextButton(
                      onPressed: _loading
                          ? null
                          : () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const SignupScreen(),
                                ),
                              );
                            },
                      child: const Text("Créer un compte"),
                    )
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
