import 'package:http/http.dart' as http;
import 'auth_service.dart';

class HttpAuth {
  static Future<http.Response> get(Uri url) async {
    final t = await AuthService.token();
    return http.get(url, headers: _h(t));
  }

  static Future<http.Response> post(Uri url, {Object? body}) async {
    final t = await AuthService.token();
    return http.post(url, headers: _h(t), body: body);
  }

  static Map<String, String> _h(String? token) => {
        "Content-Type": "application/json",
        if (token != null) "Authorization": "Bearer $token"
      };
}
