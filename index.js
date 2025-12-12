import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import axios from 'axios';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

async function fetchAllHighlights() {
    try {
        const url = "https://www.scorebat.com/video-api/v3/";
        const res = await axios.get(url, { timeout: 7000 });
        return res.data.response || [];
    } catch (e) {
        console.error("하이라이트 API 요청 실패:", e.message);
        return [];
    }
}

async function getChelseaHighlight() {
    const list = await fetchAllHighlights();
    return list.find(m =>
        m.title && m.title.toLowerCase().includes("chelsea")
    );
}

function buildHighlightEmbed(data) {
    const clubBadge = "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/200px-Chelsea_FC.png";

    const safeUrl = data.matchviewUrl || data.url || "https://www.scorebat.com";
    const safeThumb = data.side1?.url
        || "https://upload.wikimedia.org/wikipedia/commons/6/6f/Football_pictogram.svg";

    const dateStr = data.date
        ? new Date(data.date).toLocaleDateString("ko-KR")
        : "알 수 없음";

    const competition = data.competition || "알 수 없는 리그";

    return new EmbedBuilder()
        .setColor("#0A3BFF")
        .setAuthor({
            name: "첼시 하이라이트 알림",
            iconURL: clubBadge
        })
        .setTitle(`📺 ${data.title || "경기 하이라이트"}`)
        .setURL(safeUrl)
        .setDescription(
`
━━━━━━━━━━━━━━━━━━━━━━━

🏆 **대회**
${competition}

📅 **경기 날짜**
${dateStr}

🎥 **하이라이트**
[영상 보러 가기](${safeUrl})

━━━━━━━━━━━━━━━━━━━━━━━
`
        )
        .setThumbnail(safeThumb)
        .setImage(data.thumbnail || null)
        .setFooter({
            text: "ChelseaBot • Scorebat 제공",
            iconURL: clubBadge
        });
}

function buildButtons(data) {
    const highlightUrl =
        data.matchviewUrl ||
        data.url ||
        "https://www.scorebat.com";

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel("하이라이트 보기")
            .setStyle(ButtonStyle.Link)
            .setURL(highlightUrl)
    );
}

client.once("ready", () => {
    console.log(`봇 로그인 완료: ${client.user.tag}`);
});

const commands = [
    {
        name: "chelsea",
        description: "최신 첼시 경기 하이라이트를 보여줍니다"
    }
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("명령어 등록 완료: /chelsea");
    } catch (e) {
        console.error("명령어 등록 실패:", e);
    }
})();

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        await interaction.deferReply();

        if (interaction.commandName === "chelsea") {
            const data = await getChelseaHighlight();
            if (!data) {
                return interaction.editReply("첼시 하이라이트를 찾을 수 없습니다.");
            }

            return interaction.editReply({
                embeds: [buildHighlightEmbed(data)],
                components: [buildButtons(data)]
            });
        }

    } catch (err) {
        console.error("인터랙션 오류:", err);
        return interaction.editReply("처리 중 오류.");
    }
});

client.login(DISCORD_TOKEN);
