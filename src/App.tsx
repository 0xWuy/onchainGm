import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Activity,
	ArrowUpRight,
	CheckCircle2,
	Copy,
	ExternalLink,
	Loader2,
	MessageCircle,
	Moon,
	PlugZap,
	RadioTower,
	Send,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import {
	createWalletClient,
	custom,
	numberToHex,
	parseGwei,
	type Hash,
} from "viem";
import { arcTestnet, defaultChainId, supportedChains } from "./lib/chains";
import { getPublicClient, getSupportedChain } from "./lib/clients";
import { GmPost, getGmContractAddress, gmAbi } from "./lib/gmContract";

const explorerBaseUrl = arcTestnet.blockExplorers.default.url;

type TxState = "idle" | "wallet" | "confirming" | "success";

export function App() {
	const [message, setMessage] = useState("GM Arc");
	const [account, setAccount] = useState<`0x${string}`>();
	const [activeChainId, setActiveChainId] = useState(defaultChainId);
	const [totalGms, setTotalGms] = useState<bigint>();
	const [myGms, setMyGms] = useState<bigint>();
	const [recentGms, setRecentGms] = useState<GmPost[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isSwitching, setIsSwitching] = useState(false);
	const [txState, setTxState] = useState<TxState>("idle");
	const [txHash, setTxHash] = useState<Hash>();
	const [error, setError] = useState<string>();
	const [copied, setCopied] = useState(false);

	const selectedChainId = useMemo(() => {
		const activeChainIsSupported = supportedChains.some(
			(chain) => chain.id === activeChainId,
		);

		if (activeChainIsSupported) {
			return activeChainId;
		}

		return defaultChainId;
	}, [activeChainId]);

	const selectedChain = getSupportedChain(selectedChainId);
	const gmAddress = getGmContractAddress(selectedChainId);
	const isConnected = Boolean(account);
	const isWrongChain = isConnected && activeChainId !== selectedChainId;
	const isBusy =
		txState === "wallet" || txState === "confirming" || isSwitching;

	const loadContractData = useCallback(async () => {
		if (!gmAddress) {
			return;
		}

		setIsLoading(true);
		setError(undefined);

		try {
			const publicClient = getPublicClient(selectedChainId);
			const [total, recent, mine] = await Promise.all([
				publicClient.readContract({
					address: gmAddress,
					abi: gmAbi,
					functionName: "totalGms",
				}),
				publicClient.readContract({
					address: gmAddress,
					abi: gmAbi,
					functionName: "getRecentGms",
					args: [12n],
				}),
				account
					? publicClient.readContract({
							address: gmAddress,
							abi: gmAbi,
							functionName: "gmCountByAddress",
							args: [account],
						})
					: Promise.resolve(0n),
			]);

			setTotalGms(total);
			setRecentGms([...recent] as GmPost[]);
			setMyGms(mine);
		} catch (readError) {
			setError(getErrorMessage(readError));
		} finally {
			setIsLoading(false);
		}
	}, [account, gmAddress, selectedChainId]);

	useEffect(() => {
		void loadContractData();
	}, [loadContractData]);

	useEffect(() => {
		const ethereum = window.ethereum;

		if (!ethereum) {
			return;
		}

		void ethereum
			.request({ method: "eth_accounts" })
			.then((accounts) => {
				const [firstAccount] = accounts as `0x${string}`[];
				setAccount(firstAccount);
			})
			.catch(() => undefined);

		void ethereum
			.request({ method: "eth_chainId" })
			.then((chainId) => setActiveChainId(Number(chainId)))
			.catch(() => undefined);

		const handleAccountsChanged = (...args: unknown[]) => {
			const [accounts] = args as [`0x${string}`[]];
			setAccount(accounts[0]);
		};

		const handleChainChanged = (...args: unknown[]) => {
			const [chainId] = args as [string];
			setActiveChainId(Number(chainId));
		};

		ethereum.on?.("accountsChanged", handleAccountsChanged);
		ethereum.on?.("chainChanged", handleChainChanged);

		return () => {
			ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
			ethereum.removeListener?.("chainChanged", handleChainChanged);
		};
	}, []);

	async function connectWallet() {
		if (!window.ethereum) {
			setError(
				"No browser wallet found. Install MetaMask or another EVM wallet.",
			);
			return;
		}

		setIsConnecting(true);
		setError(undefined);

		try {
			const accounts = (await window.ethereum.request({
				method: "eth_requestAccounts",
			})) as `0x${string}`[];
			const chainId = (await window.ethereum.request({
				method: "eth_chainId",
			})) as string;

			setAccount(accounts[0]);
			setActiveChainId(Number(chainId));
		} catch (connectError) {
			setError(getErrorMessage(connectError));
		} finally {
			setIsConnecting(false);
		}
	}

	function disconnectWallet() {
		setAccount(undefined);
		setMyGms(undefined);
	}

	async function switchToSelectedChain() {
		if (!window.ethereum) {
			setError("No browser wallet found.");
			return;
		}

		setIsSwitching(true);
		setError(undefined);

		try {
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId: numberToHex(selectedChain.id) }],
			});
		} catch (switchError) {
			const code = getErrorCode(switchError);

			if (code === 4902) {
				await window.ethereum.request({
					method: "wallet_addEthereumChain",
					params: [
						{
							chainId: numberToHex(selectedChain.id),
							chainName: selectedChain.name,
							nativeCurrency: selectedChain.nativeCurrency,
							rpcUrls: selectedChain.rpcUrls.default.http,
							blockExplorerUrls: selectedChain.blockExplorers
								? [selectedChain.blockExplorers.default.url]
								: undefined,
						},
					],
				});
			} else {
				setError(getErrorMessage(switchError));
			}
		} finally {
			setIsSwitching(false);
		}
	}

	async function sendGm() {
		if (!gmAddress) {
			return;
		}

		if (!isConnected) {
			await connectWallet();
			return;
		}

		if (isWrongChain) {
			await switchToSelectedChain();
			return;
		}

		if (!window.ethereum || !account) {
			return;
		}

		const publicClient = getPublicClient(selectedChainId);
		const walletClient = createWalletClient({
			account,
			chain: selectedChain,
			transport: custom(window.ethereum),
		});
		const feeOverrides =
			selectedChainId === arcTestnet.id
				? {
						maxFeePerGas: parseGwei("20"),
						maxPriorityFeePerGas: parseGwei("1"),
					}
				: {};

		setTxState("wallet");
		setError(undefined);

		try {
			const { request } = await publicClient.simulateContract({
				account,
				address: gmAddress,
				abi: gmAbi,
				functionName: "sayGM",
				args: [message.trim()],
				...feeOverrides,
			});
			const hash = await walletClient.writeContract(request);

			setTxHash(hash);
			setTxState("confirming");

			await publicClient.waitForTransactionReceipt({ hash });
			setTxState("success");
			await loadContractData();
		} catch (writeError) {
			setTxState("idle");
			setError(getErrorMessage(writeError));
		}
	}

	async function copyContractAddress() {
		if (!gmAddress) {
			return;
		}

		await navigator.clipboard.writeText(gmAddress);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	}

	const ctaLabel = getCtaLabel({
		hasContract: Boolean(gmAddress),
		isConnected,
		isWrongChain,
		isBusy,
		txState,
	});

	return (
		<main className="app-shell">
			<Header
				address={account}
				isConnected={isConnected}
				isConnecting={isConnecting}
				onConnect={connectWallet}
				onDisconnect={disconnectWallet}
			/>

			<section className="hero-band">
				<div className="hero-copy">
					<div className="eyebrow">
						<Moon size={16} />
						Arc Testnet dApp
					</div>
					<h1>Send an on-chain GM.</h1>
					<p>
						A compact starter app for learning wallet connection, contract
						reads, and contract writes on Arc.
					</p>
				</div>

				<div className="chain-visual" aria-hidden="true">
					<div className="block block-a">GM</div>
					<div className="block block-b">Arc</div>
					<div className="block block-c">USDC</div>
					<div className="signal-line" />
				</div>
			</section>

			<section className="stats-grid" aria-label="GM stats">
				<StatCard
					icon={<Activity size={18} />}
					label="Total GMs"
					value={isLoading ? "..." : formatBigint(totalGms)}
				/>
				<StatCard
					icon={<Wallet size={18} />}
					label="Your GMs"
					value={account ? formatBigint(myGms) : "-"}
				/>
				<StatCard
					icon={<ShieldCheck size={18} />}
					label="Network"
					value={selectedChain.name}
				/>
			</section>

			<section className="workspace">
				<div className="composer-panel">
					<div className="panel-heading">
						<div>
							<span className="section-label">Compose</span>
							<h2>GM message</h2>
						</div>
						<StatusPill
							selectedChainName={selectedChain.name}
							isWrongChain={isWrongChain}
						/>
					</div>

					<label className="message-label" htmlFor="gm-message">
						Message
					</label>
					<textarea
						id="gm-message"
						value={message}
						maxLength={120}
						onChange={(event) => setMessage(event.target.value)}
						placeholder="GM Arc"
					/>
					<div className="composer-meta">
						<span>{message.length}/120</span>
						{txHash ? (
							<a
								href={`${explorerBaseUrl}/tx/${txHash}`}
								target="_blank"
								rel="noreferrer"
							>
								View tx <ExternalLink size={14} />
							</a>
						) : null}
					</div>

					<button
						className="primary-action"
						type="button"
						onClick={sendGm}
						disabled={!gmAddress || isBusy}
					>
						{isBusy ? (
							<Loader2 className="spin" size={18} />
						) : txState === "success" ? (
							<CheckCircle2 size={18} />
						) : isWrongChain ? (
							<PlugZap size={18} />
						) : (
							<Send size={18} />
						)}
						{ctaLabel}
					</button>

					{error ? <p className="error-text">{error}</p> : null}

					<div className="contract-row">
						<div>
							<span className="muted">Contract</span>
							<strong>
								{gmAddress ? shortAddress(gmAddress) : "Not deployed yet"}
							</strong>
						</div>
						{gmAddress ? (
							<button
								className="icon-button"
								type="button"
								onClick={copyContractAddress}
							>
								{copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
								<span className="sr-only">Copy contract address</span>
							</button>
						) : null}
					</div>

					{!gmAddress ? <SetupNotice /> : null}
				</div>

				<div className="feed-panel">
					<div className="panel-heading">
						<div>
							<span className="section-label">Live feed</span>
							<h2>Recent GMs</h2>
						</div>
						<RadioTower size={20} />
					</div>

					<div className="feed-list">
						{isLoading ? (
							<FeedSkeleton />
						) : recentGms.length > 0 ? (
							recentGms.map((gm, index) => (
								<article
									className="feed-item"
									key={`${gm.sender}-${gm.createdAt}-${index}`}
								>
									<div className="feed-avatar">
										{gm.message.slice(0, 2).toUpperCase()}
									</div>
									<div>
										<div className="feed-title">
											<strong>{shortAddress(gm.sender)}</strong>
											<span>{formatTimestamp(gm.createdAt)}</span>
										</div>
										<p>{gm.message}</p>
									</div>
								</article>
							))
						) : (
							<div className="empty-state">
								<MessageCircle size={28} />
								<p>No GMs yet.</p>
							</div>
						)}
					</div>
				</div>
			</section>

			<footer className="footer">
				<span>Built for Arc Testnet</span>
				<a href="https://docs.arc.io/" target="_blank" rel="noreferrer">
					Arc docs <ArrowUpRight size={14} />
				</a>
			</footer>
		</main>
	);
}

function Header({
	address,
	isConnected,
	isConnecting,
	onConnect,
	onDisconnect,
}: {
	address?: `0x${string}`;
	isConnected: boolean;
	isConnecting: boolean;
	onConnect: () => void;
	onDisconnect: () => void;
}) {
	return (
		<header className="topbar">
			<a className="brand" href="/">
				<img className="brand-mark" src="/0xWuy.jpg" alt="0xWuy" />
				<span>0xWuy ARC GM</span>
			</a>

			{isConnected ? (
				<button className="wallet-button" type="button" onClick={onDisconnect}>
					<Wallet size={17} />
					{shortAddress(address)}
				</button>
			) : (
				<button className="wallet-button" type="button" onClick={onConnect}>
					{isConnecting ? (
						<Loader2 className="spin" size={17} />
					) : (
						<Wallet size={17} />
					)}
					Connect
				</button>
			)}
		</header>
	);
}

function StatCard({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="stat-card">
			<div className="stat-icon">{icon}</div>
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function StatusPill({
	selectedChainName,
	isWrongChain,
}: {
	selectedChainName: string;
	isWrongChain: boolean;
}) {
	return (
		<span className={isWrongChain ? "status-pill warning" : "status-pill"}>
			{isWrongChain ? "Switch needed" : selectedChainName}
		</span>
	);
}

function SetupNotice() {
	return (
		<div className="setup-notice">
			<strong>Contract address missing</strong>
			<p>
				Deploy the GM contract, then add its address to <code>.env.local</code>.
			</p>
		</div>
	);
}

function FeedSkeleton() {
	return (
		<>
			<div className="feed-skeleton" />
			<div className="feed-skeleton" />
			<div className="feed-skeleton" />
		</>
	);
}

function getCtaLabel({
	hasContract,
	isConnected,
	isWrongChain,
	isBusy,
	txState,
}: {
	hasContract: boolean;
	isConnected: boolean;
	isWrongChain: boolean;
	isBusy: boolean;
	txState: TxState;
}) {
	if (!hasContract) {
		return "Deploy contract first";
	}

	if (!isConnected) {
		return "Connect wallet";
	}

	if (isWrongChain) {
		return "Switch network";
	}

	if (txState === "wallet") {
		return "Open wallet";
	}

	if (txState === "confirming") {
		return "Confirming";
	}

	if (isBusy) {
		return "Working";
	}

	return "Send GM";
}

function shortAddress(value?: string) {
	if (!value) {
		return "-";
	}

	return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatBigint(value?: bigint) {
	if (value === undefined) {
		return "0";
	}

	return value.toString();
}

function formatTimestamp(value: bigint) {
	const date = new Date(Number(value) * 1000);

	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function getErrorCode(error: unknown) {
	if (typeof error === "object" && error !== null && "code" in error) {
		return Number((error as { code: number | string }).code);
	}

	return undefined;
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Something went wrong.";
}
