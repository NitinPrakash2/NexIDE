import { OAuth2Client } from "google-auth-library";
import { UserRepository } from "../repositories/userRepository.js";
import { signAccessToken, signRefreshToken } from "../config/jwt.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { log } from "../helpers/logger.js";

const userRepository = new UserRepository();

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL)
  : null;

const githubClient = env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
  ? { id: env.GITHUB_CLIENT_ID, secret: env.GITHUB_CLIENT_SECRET }
  : null;

const sanitizeUser = (user) => {
  const { password, refreshToken, ...safeUser } = user;
  return safeUser;
};

const exchangeGithubCode = async (code) => {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
  });

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.error) {
    throw AppError.unauthorized(`GitHub OAuth error: ${data.error_description || data.error}`);
  }
  return data.access_token;
};

const fetchGithubUser = async (accessToken) => {
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!userRes.ok) {
    throw AppError.unauthorized("Failed to fetch GitHub user info");
  }
  return userRes.json();
};

const fetchGithubEmails = async (accessToken) => {
  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!emailsRes.ok) return [];
  const emails = await emailsRes.json();
  const primary = emails.find((e) => e.primary && e.verified);
  return primary || emails[0] || null;
};

export class OAuthService {
  async authenticateWithGoogle(idToken) {
    if (!googleClient) {
      throw AppError.internal("Google OAuth is not configured");
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw AppError.unauthorized("Invalid Google ID token");
    }

    if (!payload || !payload.email) {
      throw AppError.unauthorized("Could not retrieve user info from Google");
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const fullName = payload.name || email.split("@")[0];
    const avatar = payload.picture;

    let user = await userRepository.findByProvider("GOOGLE", googleId);

    if (!user) {
      const existingByEmail = await userRepository.findByEmail(email);
      if (existingByEmail) {
        if (existingByEmail.provider === "GOOGLE") {
          user = await userRepository.updateById(existingByEmail.id, {
            providerId: googleId,
            avatar: avatar || existingByEmail.avatar,
          });
        } else {
          throw AppError.conflict(
            "An account with this email already exists using email/password login"
          );
        }
      } else {
        const usernameBase = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        let username = usernameBase;
        let suffix = 1;
        while (await userRepository.findByUsername(username)) {
          username = `${usernameBase}${suffix}`;
          suffix++;
        }

        user = await userRepository.create({
          fullName,
          username,
          email,
          avatar: avatar || null,
          provider: "GOOGLE",
          providerId: googleId,
          isVerified: true,
        });
      }
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    await userRepository.updateRefreshToken(user.id, refreshToken);
    await userRepository.updateLastLogin(user.id);

    log.info("Google login successful", { userId: user.id, email: user.email });

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  }

  async authenticateWithGithub(code) {
    if (!githubClient) {
      throw AppError.internal("GitHub OAuth is not configured");
    }

    const githubAccessToken = await exchangeGithubCode(code);
    const githubUser = await fetchGithubUser(githubAccessToken);
    const emailObj = await fetchGithubEmails(githubAccessToken);

    const githubId = String(githubUser.id);
    const email = (emailObj?.email || githubUser.email || "").toLowerCase().trim();
    const fullName = githubUser.name || githubUser.login;
    const avatar = githubUser.avatar_url;

    if (!email) {
      throw AppError.unauthorized("No verified email found on your GitHub account");
    }

    let user = await userRepository.findByProvider("GITHUB", githubId);

    if (!user) {
      const existingByEmail = await userRepository.findByEmail(email);
      if (existingByEmail) {
        if (existingByEmail.provider === "GITHUB") {
          user = await userRepository.updateById(existingByEmail.id, {
            providerId: githubId,
            avatar: avatar || existingByEmail.avatar,
          });
        } else {
          throw AppError.conflict(
            "An account with this email already exists using a different login method"
          );
        }
      } else {
        const usernameBase = githubUser.login.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        let username = usernameBase;
        let suffix = 1;
        while (await userRepository.findByUsername(username)) {
          username = `${usernameBase}${suffix}`;
          suffix++;
        }

        user = await userRepository.create({
          fullName,
          username,
          email,
          avatar: avatar || null,
          provider: "GITHUB",
          providerId: githubId,
          isVerified: true,
        });
      }
    }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });

    await userRepository.updateRefreshToken(user.id, refreshToken);
    await userRepository.updateLastLogin(user.id);

    log.info("GitHub login successful", { userId: user.id, email: user.email });

    return { accessToken, refreshToken, user: sanitizeUser(user), githubAccessToken };
  }
}
